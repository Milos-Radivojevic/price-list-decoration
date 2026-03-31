import { useState, useEffect } from 'react'
import { db } from '../firebase'
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, orderBy, query, serverTimestamp, deleteField,
} from 'firebase/firestore'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

const emptyForm = { naziv: '', opis: '', cenaMuska: '', cenaZenska: '', grupa: 'rever', slikeUrls: [], redosled: '' }

const inputCls = (err) =>
  `w-full px-3 py-2 text-sm text-gray-900 bg-white border rounded-lg outline-none transition-all
   ${err ? 'border-red-400 ring-1 ring-red-200' : 'border-gray-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100'}`

function getCoverUrl(d) {
  if (d.slikeUrls?.length) return d.slikeUrls[0]
  return d.slikaUrl || ''
}

export default function AdminDekoracije() {
  const [dekoracije, setDekoracije] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [urlInput, setUrlInput] = useState('')

  async function load() {
    setLoading(true)
    try {
      const q = query(collection(db, 'dekoracije'), orderBy('redosled', 'asc'))
      const snap = await getDocs(q)
      setDekoracije(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null); setForm(emptyForm); setErrors({}); setUrlInput(''); setShowForm(true)
  }

  function openEdit(d) {
    setEditing(d.id)
    setForm({
      naziv: d.naziv || '',
      opis: d.opis || '',
      cenaMuska: d.cenaMuska != null ? String(d.cenaMuska) : '',
      cenaZenska: d.cenaZenska != null ? String(d.cenaZenska) : '',
      grupa: d.grupa || 'rever',
      slikeUrls: d.slikeUrls?.length ? d.slikeUrls : (d.slikaUrl ? [d.slikaUrl] : []),
      redosled: d.redosled != null ? String(d.redosled) : '',
    })
    setErrors({}); setUrlInput(''); setShowForm(true)
  }

  function cancel() {
    setShowForm(false); setEditing(null); setForm(emptyForm)
    setErrors({}); setUploadProgress(0); setUrlInput('')
  }

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (form.slikeUrls.length >= 5) return
    setUploading(true); setUploadProgress(0)
    const data = new FormData()
    data.append('file', file)
    data.append('upload_preset', UPLOAD_PRESET)
    try {
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', ev => {
          if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100))
        })
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            const res = JSON.parse(xhr.responseText)
            const url = res.secure_url.replace('/upload/', '/upload/c_limit,w_1200/')
            setForm(f => ({ ...f, slikeUrls: [...f.slikeUrls, url] }))
            resolve()
          } else {
            let msg = 'Upload nije uspeo'
            try {
              const res = JSON.parse(xhr.responseText)
              if (res?.error?.message) msg = res.error.message
            } catch { /* non-JSON */ }
            reject(new Error(msg))
          }
        })
        xhr.addEventListener('error', () => reject(new Error('Greška mreže')))
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`)
        xhr.send(data)
      })
    } catch (err) {
      setErrors(er => ({ ...er, upload: err.message }))
    } finally {
      setUploading(false); e.target.value = ''
    }
  }

  function addFromUrl() {
    const url = urlInput.trim()
    if (!url || form.slikeUrls.length >= 5) return
    setForm(f => ({ ...f, slikeUrls: [...f.slikeUrls, url] }))
    setUrlInput('')
  }

  function removeImage(i) {
    setForm(f => ({ ...f, slikeUrls: f.slikeUrls.filter((_, idx) => idx !== i) }))
  }

  function validate() {
    const e = {}
    if (!form.naziv.trim()) e.naziv = 'Naziv je obavezan'
    if (!form.cenaMuska.trim()) e.cenaMuska = 'Obavezno'
    else if (isNaN(Number(form.cenaMuska)) || Number(form.cenaMuska) < 0) e.cenaMuska = 'Mora biti broj'
    if (!form.cenaZenska.trim()) e.cenaZenska = 'Obavezno'
    else if (isNaN(Number(form.cenaZenska)) || Number(form.cenaZenska) < 0) e.cenaZenska = 'Mora biti broj'
    if (form.redosled.trim() && isNaN(Number(form.redosled))) e.redosled = 'Mora biti broj'
    return e
  }

  async function handleSave(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)
    try {
      const data = {
        naziv: form.naziv.trim(),
        opis: form.opis.trim(),
        cenaMuska: Number(form.cenaMuska),
        cenaZenska: Number(form.cenaZenska),
        grupa: form.grupa,
        slikeUrls: form.slikeUrls,
        redosled: form.redosled.trim() ? Number(form.redosled) : 0,
      }
      if (editing) {
        await updateDoc(doc(db, 'dekoracije', editing), { ...data, slikaUrl: deleteField() })
      } else {
        await addDoc(collection(db, 'dekoracije'), { ...data, kreirano: serverTimestamp() })
      }
      await load(); cancel()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Obrisati ovu dekoraciju?')) return
    setDeletingId(id)
    try {
      await deleteDoc(doc(db, 'dekoracije', id))
      setDekoracije(prev => prev.filter(d => d.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  const canAddMore = form.slikeUrls.length < 5

  return (
    <div>
      {/* Top row */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h2 className="text-lg font-bold text-gray-900">Dekoracije</h2>
        <button onClick={openNew}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors">
          + Dodaj dekoraciju
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            {editing ? 'Izmeni dekoraciju' : 'Nova dekoracija'}
          </h3>
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              {/* Naziv */}
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700">Naziv *</label>
                <input type="text" value={form.naziv} placeholder="Naziv dekoracije"
                  onChange={e => setForm(f => ({ ...f, naziv: e.target.value }))}
                  className={inputCls(errors.naziv)} />
                {errors.naziv && <p className="text-xs text-red-500">{errors.naziv}</p>}
              </div>

              {/* Opis */}
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700">Opis <span className="text-gray-400 font-normal">(opciono)</span></label>
                <textarea value={form.opis} rows={3} placeholder="Kratki opis dekoracije koji će videti kupci..."
                  onChange={e => setForm(f => ({ ...f, opis: e.target.value }))}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none resize-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all" />
              </div>

              {/* Muška cena */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700">Muška cena (RSD) *</label>
                <input type="number" value={form.cenaMuska} placeholder="0" min="0"
                  onChange={e => setForm(f => ({ ...f, cenaMuska: e.target.value }))}
                  className={inputCls(errors.cenaMuska)} />
                {errors.cenaMuska && <p className="text-xs text-red-500">{errors.cenaMuska}</p>}
              </div>

              {/* Ženska cena */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700">Ženska cena (RSD) *</label>
                <input type="number" value={form.cenaZenska} placeholder="0" min="0"
                  onChange={e => setForm(f => ({ ...f, cenaZenska: e.target.value }))}
                  className={inputCls(errors.cenaZenska)} />
                {errors.cenaZenska && <p className="text-xs text-red-500">{errors.cenaZenska}</p>}
              </div>

              {/* Grupa */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700">Grupa</label>
                <select value={form.grupa}
                  onChange={e => setForm(f => ({ ...f, grupa: e.target.value }))}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all appearance-none">
                  <option value="rever">Rever</option>
                  <option value="narukvica">Narukvica</option>
                </select>
              </div>

              {/* Redosled */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-700">Redosled</label>
                <input type="number" value={form.redosled} placeholder="0"
                  onChange={e => setForm(f => ({ ...f, redosled: e.target.value }))}
                  className={inputCls(errors.redosled)} />
                {errors.redosled && <p className="text-xs text-red-500">{errors.redosled}</p>}
              </div>

              {/* ── Multi-image section ── */}
              <div className="sm:col-span-2 flex flex-col gap-3">
                <label className="text-xs font-medium text-gray-700">
                  Slike
                  <span className="text-gray-400 font-normal ml-1">(max 5 · prva slika je naslovna)</span>
                </label>

                {/* Uploaded images grid */}
                {form.slikeUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.slikeUrls.map((url, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={url}
                          alt={`Slika ${i + 1}`}
                          className="w-20 h-16 object-cover rounded-lg border border-gray-200"
                        />
                        {i === 0 && (
                          <span className="absolute top-1 left-1 text-[9px] font-semibold bg-rose-500 text-white px-1 py-0.5 rounded leading-none">
                            Naslovna
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs leading-none transition-colors shadow-sm"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                {canAddMore && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer
                      ${uploading
                        ? 'opacity-60 cursor-not-allowed bg-white border-gray-300 text-gray-400'
                        : 'bg-white border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-400'
                      }`}>
                      {uploading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin shrink-0" />
                          Otpremanje {uploadProgress}%
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" width="15" height="15">
                            <path d="M10 3v10M6 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M3 14v1a2 2 0 002 2h10a2 2 0 002-2v-1" strokeLinecap="round" />
                          </svg>
                          + Dodaj sliku
                        </>
                      )}
                      <input type="file" accept="image/*" onChange={handleFileChange}
                        disabled={uploading} className="hidden" />
                    </label>
                    {uploading && (
                      <div className="flex-1 min-w-[80px] max-w-[160px] h-1.5 bg-rose-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full transition-all duration-100"
                          style={{ width: `${uploadProgress}%` }} />
                      </div>
                    )}
                  </div>
                )}

                {errors.upload && <p className="text-xs text-red-500">{errors.upload}</p>}

                {/* URL input */}
                {canAddMore && (
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[11px] text-gray-400">ili unesite URL slike</label>
                      <input
                        type="url"
                        value={urlInput}
                        placeholder="https://..."
                        disabled={uploading}
                        onChange={e => setUrlInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFromUrl())}
                        className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all disabled:opacity-50"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addFromUrl}
                      disabled={!urlInput.trim() || uploading}
                      className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      Dodaj
                    </button>
                  </div>
                )}

                {!canAddMore && (
                  <p className="text-xs text-gray-400">Maksimalan broj slika (5) je dostignut.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={cancel}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 hover:border-gray-400 rounded-xl transition-all">
                Otkaži
              </button>
              <button type="submit" disabled={saving}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors">
                {saving ? 'Čuvanje...' : (editing ? 'Sačuvaj izmene' : 'Dodaj dekoraciju')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-[3px] border-rose-100 border-t-rose-500 rounded-full animate-spin" />
        </div>
      ) : dekoracije.length === 0 ? (
        <p className="text-center py-16 text-gray-400 text-sm">Nema dekoracija. Dodajte prvu!</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[56px_1fr_90px_110px_110px_140px] gap-3 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Slika</span>
            <span>Naziv</span>
            <span>Grupa</span>
            <span>Muška</span>
            <span>Ženska</span>
            <span>Akcije</span>
          </div>

          <div className="divide-y divide-gray-200">
          {dekoracije.map((d) => {
            const cover = getCoverUrl(d)
            const imgCount = d.slikeUrls?.length || (d.slikaUrl ? 1 : 0)
            return (
              <div key={d.id}
                className="flex sm:grid sm:grid-cols-[56px_1fr_90px_110px_110px_140px] gap-3 px-6 py-4 items-center bg-white hover:bg-gray-50 transition-colors">
                {/* Thumb */}
                <div className="shrink-0 relative">
                  {cover
                    ? <img src={cover} alt={d.naziv} className="w-14 h-11 object-cover rounded-lg border border-gray-200" />
                    : <div className="w-14 h-11 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">—</div>
                  }
                  {imgCount > 1 && (
                    <span className="absolute -bottom-1 -right-1 text-[9px] bg-gray-700 text-white rounded px-1 leading-4">
                      {imgCount}
                    </span>
                  )}
                </div>

                {/* Name + mobile meta */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{d.naziv}</p>
                  <div className="sm:hidden flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ring-1
                      ${d.grupa === 'narukvica' ? 'bg-sky-50 text-sky-700 ring-sky-200' : 'bg-rose-50 text-rose-700 ring-rose-200'}`}>
                      {d.grupa === 'narukvica' ? 'Narukvica' : 'Rever'}
                    </span>
                    <span className="text-xs text-rose-600 font-semibold">
                      M: {d.cenaMuska?.toLocaleString('sr-RS')} · Ž: {d.cenaZenska?.toLocaleString('sr-RS')} RSD
                    </span>
                  </div>
                </div>

                {/* Grupa (desktop) */}
                <span className={`hidden sm:inline text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 w-fit
                  ${d.grupa === 'narukvica' ? 'bg-sky-50 text-sky-700 ring-sky-200' : 'bg-rose-50 text-rose-700 ring-rose-200'}`}>
                  {d.grupa === 'narukvica' ? 'Narukvica' : 'Rever'}
                </span>

                {/* Prices (desktop) */}
                <span className="hidden sm:block text-rose-600 font-semibold text-xs">
                  {d.cenaMuska?.toLocaleString('sr-RS')} RSD
                </span>
                <span className="hidden sm:block text-rose-600 font-semibold text-xs">
                  {d.cenaZenska?.toLocaleString('sr-RS')} RSD
                </span>

                {/* Actions */}
                <div className="shrink-0 flex gap-2">
                  <button onClick={() => openEdit(d)}
                    className="px-3 py-1.5 text-xs border border-gray-300 hover:border-rose-400 hover:text-rose-600 text-gray-600 rounded-lg transition-all">
                    Izmeni
                  </button>
                  <button onClick={() => handleDelete(d.id)} disabled={deletingId === d.id}
                    className="px-3 py-1.5 text-xs border border-red-200 hover:bg-red-50 text-red-500 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {deletingId === d.id ? '...' : 'Obriši'}
                  </button>
                </div>
              </div>
            )
          })}
          </div>
        </div>
      )}
    </div>
  )
}
