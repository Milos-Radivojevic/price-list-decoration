import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, getDocs, addDoc, orderBy, query, serverTimestamp } from 'firebase/firestore'

// ── Exported constants & helpers ─────────────────────────────────────────────
export const STATUSES = [
  { key: 'novi',          label: 'Novi',          bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-400',   border: 'border-l-blue-400'   },
  { key: 'kontaktiraj',   label: 'Kontaktiraj',   bg: 'bg-amber-100',  text: 'text-amber-800',  dot: 'bg-amber-400',  border: 'border-l-amber-400'  },
  { key: 'u_pregovorima', label: 'U pregovorima', bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-400', border: 'border-l-purple-400' },
  { key: 'dobijeno',      label: 'Dobijeno',      bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-400',  border: 'border-l-green-400'  },
  { key: 'izgubljeno',    label: 'Izgubljeno',    bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-300',   border: 'border-l-gray-300'   },
]

export function getStatusDef(key) {
  return STATUSES.find(s => s.key === key) ?? STATUSES[0]
}

export function calcTotal(stavke = []) {
  return stavke.reduce((acc, s) =>
    acc + (s.kolicinaMuskih ?? 0) * (s.cenaMuska ?? 0) + (s.kolicinaZenskih ?? 0) * (s.cenaZenska ?? 0), 0)
}

export function getInitials(ime = '') {
  return ime.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export function formatDate(ts, opts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('sr-RS', opts ?? { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function relativeTime(ts) {
  if (!ts) return '—'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1)   return 'malopre'
  if (mins < 60)  return `pre ${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24)     return `pre ${h}h`
  const days = Math.floor(h / 24)
  if (days === 1) return 'juče'
  if (days < 30)  return `pre ${days} dana`
  const mo = Math.floor(days / 30)
  if (mo < 12)    return `pre ${mo} mes.`
  return `pre ${Math.floor(mo / 12)} god.`
}

// ── Add Lead Modal ────────────────────────────────────────────────────────────
const emptyForm = { ime: '', telefon: '', email: '', komentar: '', status: 'novi' }

function AddLeadModal({ onClose, onCreated }) {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  function validate() {
    const e = {}
    if (!form.ime.trim())     e.ime     = 'Ime je obavezno'
    if (!form.telefon.trim()) e.telefon = 'Telefon je obavezan'
    if (!form.email.trim())   e.email   = 'Email je obavezan'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email nije ispravan'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const data = {
        ime:      form.ime.trim(),
        telefon:  form.telefon.trim(),
        email:    form.email.trim(),
        komentar: form.komentar.trim(),
        stavke:   [],
        status:   form.status,
        kreirano: serverTimestamp(),
        azurirano: serverTimestamp(),
        beleska:  '',
      }
      const ref = await addDoc(collection(db, 'lidovi'), data)
      onCreated({ id: ref.id, ...data, kreirano: new Date(), azurirano: new Date() })
    } finally {
      setSaving(false)
    }
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(er => ({ ...er, [field]: undefined }))
  }

  const inputCls = err =>
    `w-full px-3.5 py-2.5 text-sm text-gray-900 bg-white border rounded-lg outline-none transition-all
     ${err ? 'border-red-400 ring-1 ring-red-200' : 'border-gray-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100'}`

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Novi lid</h3>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all text-xl leading-none">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Ime i prezime *</label>
            <input type="text" value={form.ime} onChange={e => set('ime', e.target.value)}
              placeholder="Ime Prezime" className={inputCls(errors.ime)} />
            {errors.ime && <p className="text-xs text-red-500">{errors.ime}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Telefon *</label>
              <input type="tel" value={form.telefon} onChange={e => set('telefon', e.target.value)}
                placeholder="+381..." className={inputCls(errors.telefon)} />
              {errors.telefon && <p className="text-xs text-red-500">{errors.telefon}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all appearance-none">
                {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Email *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="email@primer.com" className={inputCls(errors.email)} />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Komentar <span className="text-gray-400 font-normal">(opciono)</span></label>
            <textarea value={form.komentar} onChange={e => set('komentar', e.target.value)}
              rows={3} placeholder="Napomena..."
              className="w-full px-3.5 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none resize-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-300 hover:border-gray-400 rounded-xl transition-all">
              Otkaži
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
              {saving ? 'Dodavanje...' : 'Dodaj lida'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ filtered }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-gray-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-700 mb-1">
        {filtered ? 'Nema lidova u ovoj kategoriji' : 'Nema lidova'}
      </p>
      <p className="text-xs text-gray-400">
        {filtered ? 'Pokušajte drugi filter' : 'Kliknite "+ Dodaj lida" da dodate prvog lida'}
      </p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminLidovi({ onSelect }) {
  const [lidovi, setLidovi]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [activeFilter, setActiveFilter] = useState('svi')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, 'lidovi'), orderBy('kreirano', 'desc'))
        const snap = await getDocs(q)
        setLidovi(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleCreated(newLead) {
    setLidovi(prev => [newLead, ...prev])
    setShowAddModal(false)
  }

  const filtered = activeFilter === 'svi' ? lidovi : lidovi.filter(l => l.status === activeFilter)
  const countFor = key => lidovi.filter(l => l.status === key).length

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-[3px] border-rose-100 border-t-rose-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Lidovi</h2>
          <p className="text-xs text-gray-500 mt-0.5">{lidovi.length} ukupno</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors">
          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Dodaj lida
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveFilter('svi')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all
            ${activeFilter === 'svi' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Svi ({lidovi.length})
        </button>
        {STATUSES.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveFilter(s.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all
              ${activeFilter === s.key
                ? `${s.bg} ${s.text} ring-1 ring-inset ring-current/30`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
            {s.label}{countFor(s.key) > 0 ? ` (${countFor(s.key)})` : ''}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState filtered={activeFilter !== 'svi'} />
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          {/* Desktop header */}
          <div className="hidden md:grid md:grid-cols-[3fr_2fr_110px_130px_100px] px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Klijent</span>
            <span>Dekoracija</span>
            <span>Vrednost</span>
            <span>Status</span>
            <span>Datum</span>
          </div>

          <div className="divide-y divide-gray-100">
            {filtered.map(l => {
              const st         = getStatusDef(l.status)
              const total      = calcTotal(l.stavke)
              const dekoNazivi = (l.stavke ?? []).map(s => s.naziv).join(', ')

              return (
                <div
                  key={l.id}
                  onClick={() => onSelect(l)}
                  className={`flex md:grid md:grid-cols-[3fr_2fr_110px_130px_100px] items-center gap-4 pl-0 pr-5 py-3.5 md:py-4 bg-white hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${st.border}`}
                >
                  {/* Left padding after border */}
                  <div className="pl-4 flex items-center gap-3 min-w-0 flex-1 md:flex-none">
                    <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {getInitials(l.ime)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{l.ime}</p>
                      <p className="text-xs text-gray-500">{l.telefon}</p>
                      {/* Mobile only: deko + status + date */}
                      <div className="md:hidden flex flex-wrap items-center gap-1.5 mt-1">
                        {dekoNazivi && <p className="text-[11px] text-gray-400 truncate max-w-[140px]">{dekoNazivi}</p>}
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
                      </div>
                    </div>
                  </div>

                  {/* Desktop columns */}
                  <span className="hidden md:block text-sm text-gray-500 truncate">{dekoNazivi || '—'}</span>
                  <span className="hidden md:block text-sm font-medium text-gray-900">
                    {total > 0 ? `${total.toLocaleString('sr-RS')} RSD` : '—'}
                  </span>
                  <span className={`hidden md:inline-flex items-center text-xs font-medium px-3 py-1 rounded-full w-fit ${st.bg} ${st.text}`}>
                    {st.label}
                  </span>
                  <div className="hidden md:block text-xs text-gray-400 shrink-0">
                    <p>{relativeTime(l.kreirano)}</p>
                    <p className="text-[11px] text-gray-300 mt-0.5">{formatDate(l.kreirano)}</p>
                  </div>

                  {/* Mobile: value + date on right */}
                  <div className="md:hidden flex flex-col items-end shrink-0">
                    {total > 0 && <span className="text-xs font-bold text-gray-900">{total.toLocaleString('sr-RS')} RSD</span>}
                    <span className="text-[11px] text-gray-400 mt-0.5">{relativeTime(l.kreirano)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showAddModal && (
        <AddLeadModal onClose={() => setShowAddModal(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}
