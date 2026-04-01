import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import {
  collection, getDocs, getDoc, addDoc, updateDoc,
  doc, orderBy, query, serverTimestamp, deleteField,
} from 'firebase/firestore'

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

const emptyForm = {
  naziv: '', opis: '', cenaMuska: '', cenaZenska: '',
  kategorijaId: '', kolekcijaId: '', tag: '', slikeUrls: [], redosled: '',
}

const inputCls = (err) =>
  `w-full px-3 py-2 text-sm text-gray-900 bg-white border rounded-lg outline-none transition-all
   ${err ? 'border-red-400 ring-1 ring-red-200' : 'border-gray-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100'}`

export default function DekoracijaForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'nova'

  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [kategorije, setKategorije] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [urlInput, setUrlInput] = useState('')

  useEffect(() => {
    async function loadData() {
      setPageLoading(true)
      try {
        // Load kategorije with subcollections
        const katSnap = await getDocs(query(collection(db, 'kategorije'), orderBy('kreirano', 'asc')))
        const kats = await Promise.all(
          katSnap.docs.map(async katDoc => {
            const kolSnap = await getDocs(
              query(collection(db, 'kategorije', katDoc.id, 'kolekcije'), orderBy('kreirano', 'asc'))
            )
            return {
              id: katDoc.id,
              ...katDoc.data(),
              kolekcije: kolSnap.docs.map(k => ({ id: k.id, ...k.data() })),
            }
          })
        )
        setKategorije(kats)

        if (isNew) {
          return  // leave emptyForm as-is; user picks category/collection
        }

        // Load existing decoration
        const docSnap = await getDoc(doc(db, 'dekoracije', id))
        if (!docSnap.exists()) { navigate('/admin'); return }
        const d = docSnap.data()
        setForm({
          naziv: d.naziv || '',
          opis: d.opis || '',
          cenaMuska: d.cenaMuska != null ? String(d.cenaMuska) : '',
          cenaZenska: d.cenaZenska != null ? String(d.cenaZenska) : '',
          kategorijaId: d.kategorijaId || kats[0]?.id || '',
          kolekcijaId: d.kolekcijaId || '',
          tag: d.tag || '',
          slikeUrls: d.slikeUrls?.length ? d.slikeUrls : (d.slikaUrl ? [d.slikaUrl] : []),
          redosled: d.redosled != null ? String(d.redosled) : '',
        })
      } finally {
        setPageLoading(false)
      }
    }
    loadData()
  }, [id])

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
            try { const r = JSON.parse(xhr.responseText); if (r?.error?.message) msg = r.error.message } catch {}
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
    setSaveError('')
    setErrors({})
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)
    try {
      const selectedKat = kategorije.find(k => k.id === form.kategorijaId)
      const selectedKol = selectedKat?.kolekcije?.find(k => k.id === form.kolekcijaId)
      const data = {
        naziv: (form.naziv || '').trim(),
        opis: (form.opis || '').trim(),
        cenaMuska: Number(form.cenaMuska) || 0,
        cenaZenska: Number(form.cenaZenska) || 0,
        kategorijaId: form.kategorijaId || '',
        kategorijaNaziv: selectedKat?.naziv || '',
        kolekcijaId: form.kolekcijaId || '',
        kolekcijaNaziv: selectedKol?.naziv || '',
        grupa: selectedKol?.slug || '',
        tag: form.tag || '',
        slikeUrls: Array.isArray(form.slikeUrls) ? form.slikeUrls : [],
        redosled: (form.redosled || '').trim() ? Number(form.redosled) : 0,
      }
      if (isNew) {
        await addDoc(collection(db, 'dekoracije'), { ...data, kreirano: serverTimestamp() })
      } else {
        await updateDoc(doc(db, 'dekoracije', id), { ...data, slikaUrl: deleteField() })
      }
      navigate('/admin', { state: { saved: true } })
    } catch (err) {
      setSaveError(`Greška: ${err?.code || err?.message || JSON.stringify(err)}`)
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const canAddMore = form.slikeUrls.length < 5
  const activeKols = kategorije.find(k => k.id === form.kategorijaId)?.kolekcije || []

  if (pageLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-[3px] border-rose-100 border-t-rose-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSave}>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">

            {/* Naziv */}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Naziv *</label>
              <input type="text" value={form.naziv} placeholder="Naziv dekoracije"
                onChange={e => setForm(f => ({ ...f, naziv: e.target.value }))}
                className={inputCls(errors.naziv)} />
              {errors.naziv && <p className="text-xs text-red-500">{errors.naziv}</p>}
            </div>

            {/* Opis */}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Opis <span className="text-gray-400 font-normal normal-case">(opciono)</span>
              </label>
              <textarea value={form.opis} rows={3} placeholder="Kratki opis dekoracije koji će videti kupci..."
                onChange={e => setForm(f => ({ ...f, opis: e.target.value }))}
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none resize-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all" />
            </div>

            {/* Muška cena */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Muška cena (RSD) *</label>
              <input type="number" value={form.cenaMuska} placeholder="0" min="0"
                onChange={e => setForm(f => ({ ...f, cenaMuska: e.target.value }))}
                className={inputCls(errors.cenaMuska)} />
              {errors.cenaMuska && <p className="text-xs text-red-500">{errors.cenaMuska}</p>}
            </div>

            {/* Ženska cena */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Ženska cena (RSD) *</label>
              <input type="number" value={form.cenaZenska} placeholder="0" min="0"
                onChange={e => setForm(f => ({ ...f, cenaZenska: e.target.value }))}
                className={inputCls(errors.cenaZenska)} />
              {errors.cenaZenska && <p className="text-xs text-red-500">{errors.cenaZenska}</p>}
            </div>

            {/* Kategorija */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Kategorija</label>
              <select
                value={form.kategorijaId}
                onChange={e => {
                  const katId = e.target.value
                  setForm(f => ({ ...f, kategorijaId: katId, kolekcijaId: '' }))
                }}
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all appearance-none">
                <option value="" disabled>Izaberi</option>
                {kategorije.map(k => (
                  <option key={k.id} value={k.id}>{k.naziv}</option>
                ))}
              </select>
            </div>

            {/* Kolekcija — only shown after a category is selected */}
            {form.kategorijaId && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Kolekcija</label>
                {activeKols.length === 0 ? (
                  <p className="text-xs text-amber-600 py-2">
                    Ova kategorija nema kolekcija. Dodajte ih u admin panelu pod „Kategorije".
                  </p>
                ) : (
                  <select
                    value={form.kolekcijaId}
                    onChange={e => setForm(f => ({ ...f, kolekcijaId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all appearance-none">
                    <option value="" disabled>Izaberi</option>
                    {activeKols.map(k => (
                      <option key={k.id} value={k.id}>{k.naziv}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Tag */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Oznaka</label>
              <select value={form.tag}
                onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all appearance-none">
                <option value="">Bez oznake</option>
                <option value="novo">Novo</option>
                <option value="akcija">Akcija</option>
              </select>
            </div>

            {/* Redosled */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Redosled</label>
              <input type="number" value={form.redosled} placeholder="0"
                onChange={e => setForm(f => ({ ...f, redosled: e.target.value }))}
                className={inputCls(errors.redosled)} />
              {errors.redosled && <p className="text-xs text-red-500">{errors.redosled}</p>}
            </div>

            {/* ── Images ── */}
            <div className="sm:col-span-2 flex flex-col gap-3">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Slike
                <span className="text-gray-400 font-normal normal-case ml-1">(max 5 · prva je naslovna)</span>
              </label>

              {/* Uploaded images */}
              {form.slikeUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.slikeUrls.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt={`Slika ${i + 1}`}
                        className="w-20 h-16 object-cover rounded-lg border border-gray-200" />
                      {i === 0 && (
                        <span className="absolute top-1 left-1 text-[9px] font-semibold bg-rose-500 text-white px-1 py-0.5 rounded leading-none">
                          Naslovna
                        </span>
                      )}
                      <button type="button" onClick={() => removeImage(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs leading-none transition-colors shadow-sm">
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
                    <input type="url" value={urlInput} placeholder="https://..." disabled={uploading}
                      onChange={e => setUrlInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFromUrl())}
                      className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all disabled:opacity-50" />
                  </div>
                  <button type="button" onClick={addFromUrl}
                    disabled={!urlInput.trim() || uploading}
                    className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
                    Dodaj
                  </button>
                </div>
              )}

              {!canAddMore && (
                <p className="text-xs text-gray-400">Maksimalan broj slika (5) je dostignut.</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-4 border-t border-gray-100">
            {saveError && (
              <p className="text-xs text-red-500 text-right">{saveError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => navigate('/admin')}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 hover:border-gray-400 rounded-xl transition-all">
                Otkaži
              </button>
              <button type="submit" disabled={saving}
                className="px-6 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors">
                {saving ? 'Čuvanje...' : (isNew ? 'Dodaj dekoraciju' : 'Sačuvaj izmene')}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
