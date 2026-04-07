import { useState, useEffect, useRef } from 'react'
import { db } from '../firebase'
import { doc, updateDoc, addDoc, getDocs, serverTimestamp, collection, orderBy, query } from 'firebase/firestore'
import { STATUSES, getStatusDef, calcTotal, getInitials, formatDateTime, relativeTime } from './AdminLidovi'

// ── History config ────────────────────────────────────────────────────────────
const HISTORY_CONFIG = {
  beleska:         { dot: 'bg-amber-400',  label: 'Beleška'  },
  status_promena:  { dot: 'bg-blue-400',   label: 'Status'   },
  stavka_dodana:   { dot: 'bg-green-400',  label: 'Dodato'   },
  stavka_obrisana: { dot: 'bg-red-400',    label: 'Obrisano' },
  kreiran:         { dot: 'bg-rose-400',   label: 'Kreiran'  },
}

// ── Status pipeline ───────────────────────────────────────────────────────────
const PIPELINE_KEYS = ['novi', 'kontaktiraj', 'u_pregovorima', 'dobijeno']

const PIPELINE_COLORS = {
  novi:          { active: 'bg-blue-500',   ring: 'ring-blue-200',   text: 'text-blue-700',   bg: 'bg-blue-50'   },
  kontaktiraj:   { active: 'bg-amber-500',  ring: 'ring-amber-200',  text: 'text-amber-700',  bg: 'bg-amber-50'  },
  u_pregovorima: { active: 'bg-purple-500', ring: 'ring-purple-200', text: 'text-purple-700', bg: 'bg-purple-50' },
  dobijeno:      { active: 'bg-green-500',  ring: 'ring-green-200',  text: 'text-green-700',  bg: 'bg-green-50'  },
  izgubljeno:    { active: 'bg-gray-400',   ring: 'ring-gray-200',   text: 'text-gray-600',   bg: 'bg-gray-50'   },
}

function StatusPipeline({ value, onChange, disabled }) {
  const pipelineIdx = PIPELINE_KEYS.indexOf(value)
  const isLost = value === 'izgubljeno'

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PIPELINE_KEYS.map((key, idx) => {
        const st = getStatusDef(key)
        const colors = PIPELINE_COLORS[key]
        const isCurrent = value === key
        const isPast = !isLost && idx < pipelineIdx
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all disabled:cursor-not-allowed
              ${isCurrent
                ? `${colors.bg} ${colors.text} ring-2 ${colors.ring} border-transparent shadow-sm`
                : isPast
                  ? 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600'
              }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCurrent ? colors.active : isPast ? 'bg-gray-400' : 'bg-gray-300'}`} />
            {st.label}
          </button>
        )
      })}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('izgubljeno')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all disabled:cursor-not-allowed
          ${isLost
            ? 'bg-red-50 text-red-600 ring-2 ring-red-200 border-transparent shadow-sm'
            : 'bg-white text-gray-400 border-gray-200 hover:border-red-200 hover:text-red-500 hover:bg-red-50'
          }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLost ? 'bg-red-500' : 'bg-gray-300'}`} />
        Izgubljeno
      </button>
    </div>
  )
}

// ── Stepper ───────────────────────────────────────────────────────────────────
function Stepper({ value, onChange }) {
  function set(n) { onChange(Math.max(0, n)) }
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => set(value - 1)}
        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center text-gray-600 font-medium transition-colors shrink-0">
        −
      </button>
      <input
        type="number" min="0" value={value}
        onChange={e => { const n = parseInt(e.target.value, 10); set(isNaN(n) ? 0 : n) }}
        className="w-10 h-8 text-center text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-lg outline-none focus:border-rose-300 transition-colors"
      />
      <button type="button" onClick={() => set(value + 1)}
        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center text-gray-600 font-medium transition-colors shrink-0">
        +
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminLeadDetail({ lead: initialLead, onBack }) {
  const [status, setStatus]           = useState(initialLead.status ?? 'novi')
  const [stavke, setStavke]           = useState(initialLead.stavke ?? [])
  const [beleska, setBeleska]         = useState(initialLead.beleska ?? '')
  const [beleskaTs, setBeleskaTs]     = useState(initialLead.beleskaAzurirano ?? null)
  const [savingBeleska, setSavingBeleska] = useState(false)
  const [beleskaSaved, setBeleskaSaved]   = useState(false)
  const [savingStatus, setSavingStatus]   = useState(false)
  const [autoSave, setAutoSave]       = useState(null) // null | 'saving' | 'saved'
  const [showAddModal, setShowAddModal]   = useState(false)
  const [dekoracije, setDekoracije]   = useState([])
  const [loadingDeko, setLoadingDeko] = useState(false)
  const [istorija, setIstorija]       = useState([])
  const [loadingIstorija, setLoadingIstorija] = useState(true)

  const saveTimer  = useRef(null)
  const clearTimer = useRef(null)

  // ── Load history ──────────────────────────────────────────────────────────
  async function loadIstorija() {
    try {
      const q = query(
        collection(db, 'lidovi', initialLead.id, 'istorija'),
        orderBy('datum', 'desc')
      )
      const snap = await getDocs(q)
      setIstorija(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } finally {
      setLoadingIstorija(false)
    }
  }

  useEffect(() => { loadIstorija() }, [])

  async function logHistory(entry) {
    await addDoc(collection(db, 'lidovi', initialLead.id, 'istorija'), {
      ...entry,
      datum: serverTimestamp(),
    })
    loadIstorija()
  }

  // ── Status change ─────────────────────────────────────────────────────────
  async function changeStatus(newStatus) {
    const oldLabel = getStatusDef(status).label
    const newLabel = getStatusDef(newStatus).label
    setSavingStatus(true)
    setStatus(newStatus)
    try {
      await updateDoc(doc(db, 'lidovi', initialLead.id), {
        status: newStatus,
        azurirano: serverTimestamp(),
      })
      await logHistory({
        tip: 'status_promena',
        opis: `Status promenjen: ${oldLabel} → ${newLabel}`,
      })
    } finally {
      setSavingStatus(false)
    }
  }

  // ── Stavke auto-save (debounced 1 s) ──────────────────────────────────────
  function commitStavke(newStavke) {
    setStavke(newStavke)
    setAutoSave('saving')
    if (saveTimer.current)  clearTimeout(saveTimer.current)
    if (clearTimer.current) clearTimeout(clearTimer.current)
    saveTimer.current = setTimeout(async () => {
      await updateDoc(doc(db, 'lidovi', initialLead.id), {
        stavke: newStavke,
        azurirano: serverTimestamp(),
      })
      setAutoSave('saved')
      clearTimer.current = setTimeout(() => setAutoSave(null), 2000)
    }, 1000)
  }

  function updateQty(id, field, value) {
    commitStavke(stavke.map(s => s.id === id ? { ...s, [field]: Math.max(0, value) } : s))
  }

  function removeStavka(id) {
    const stavka = stavke.find(s => s.id === id)
    commitStavke(stavke.filter(s => s.id !== id))
    if (stavka) {
      logHistory({ tip: 'stavka_obrisana', opis: `Stavka obrisana: ${stavka.naziv}` })
    }
  }

  // ── Beleška ───────────────────────────────────────────────────────────────
  async function saveBeleska() {
    setSavingBeleska(true)
    setBeleskaSaved(false)
    try {
      await updateDoc(doc(db, 'lidovi', initialLead.id), {
        beleska,
        beleskaAzurirano: serverTimestamp(),
        azurirano: serverTimestamp(),
      })
      await logHistory({ tip: 'beleska', opis: beleska.trim() || '(prazna beleška)' })
      setBeleskaTs(new Date())
      setBeleskaSaved(true)
      setTimeout(() => setBeleskaSaved(false), 2500)
    } finally {
      setSavingBeleska(false)
    }
  }

  // ── Add stavka modal ──────────────────────────────────────────────────────
  async function openAddModal() {
    setShowAddModal(true)
    if (dekoracije.length === 0) {
      setLoadingDeko(true)
      try {
        const q = query(collection(db, 'dekoracije'), orderBy('redosled', 'asc'))
        const snap = await getDocs(q)
        setDekoracije(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } finally {
        setLoadingDeko(false)
      }
    }
  }

  function addStavka(d) {
    const newStavka = {
      id: crypto.randomUUID(),
      naziv: d.naziv,
      dekoracijaId: d.id,
      slikaUrl: d.slikeUrls?.[0] || d.slikaUrl || '',
      grupa: d.grupa || 'rever',
      cenaMuska: d.cenaMuska ?? 0,
      cenaZenska: d.cenaZenska ?? 0,
      kolicinaMuskih: 0,
      kolicinaZenskih: 0,
    }
    commitStavke([...stavke, newStavka])
    setShowAddModal(false)
    logHistory({ tip: 'stavka_dodana', opis: `Stavka dodana: ${d.naziv}` })
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const grandTotal = calcTotal(stavke)

  return (
    <div className="max-w-5xl">
      {/* Back */}
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors group">
        <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"
          className="group-hover:-translate-x-0.5 transition-transform">
          <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
        </svg>
        Nazad na listu
      </button>

      {/* ── Header card ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        {/* Top: avatar + contact + call button */}
        <div className="flex items-start gap-4">
<div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 leading-tight">{initialLead.ime}</h2>

            {initialLead.email && (
              <a href={`mailto:${initialLead.email}`}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-rose-600 transition-colors mt-1.5 truncate">
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13" className="shrink-0 text-gray-400">
                  <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
                  <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
                </svg>
                <span className="truncate">{initialLead.email}</span>
              </a>
            )}

            <div className="flex items-center gap-2 mt-1">
              <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13" className="shrink-0 text-gray-400">
                <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-gray-700">{initialLead.telefon}</span>
              <a href={`tel:${initialLead.telefon}`}
                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors">
                <svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11">
                  <path fillRule="evenodd" d="M1.5 2.5A1.5 1.5 0 0 1 3 1h.94a1.5 1.5 0 0 1 1.463 1.17l.36 1.8a1.5 1.5 0 0 1-.697 1.584l-.587.352a11.047 11.047 0 0 0 5.115 5.115l.352-.587a1.5 1.5 0 0 1 1.584-.697l1.8.36A1.5 1.5 0 0 1 14.5 11.06V12a1.5 1.5 0 0 1-1.5 1.5c-6.075 0-11-4.925-11-11Z" clipRule="evenodd" />
                </svg>
                Pozovi
              </a>
            </div>

            <p className="text-xs text-gray-400 mt-1.5">Kreirano: {formatDateTime(initialLead.kreirano)}</p>
          </div>
        </div>

        {/* Status pipeline */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Status</span>
            {savingStatus && (
              <div className="w-3.5 h-3.5 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
            )}
          </div>
          <StatusPipeline value={status} onChange={changeStatus} disabled={savingStatus} />
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: quote + comment ── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Stavke ponude */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Stavke ponude</h3>
              {autoSave && (
                <span className={`text-xs font-medium transition-all ${autoSave === 'saving' ? 'text-amber-500' : 'text-green-600'}`}>
                  {autoSave === 'saving' ? 'Čuvanje...' : '✓ Sačuvano'}
                </span>
              )}
            </div>

            {stavke.length > 0 && (
              <div className="divide-y divide-gray-100">
                {stavke.map(s => {
                  const subtotalM = (s.kolicinaMuskih ?? 0) * (s.cenaMuska ?? 0)
                  const subtotalZ = (s.kolicinaZenskih ?? 0) * (s.cenaZenska ?? 0)
                  const lineTotal = subtotalM + subtotalZ
                  return (
                    <div key={s.id} className="p-5">
                      <div className="flex gap-4">
                        {/* Thumbnail */}
                        <div className="shrink-0">
                          {s.slikaUrl
                            ? <img src={s.slikaUrl} alt={s.naziv} className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                            : <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">—</div>
                          }
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Name row */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{s.naziv}</p>
                              <span className={`inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full ring-1
                                ${s.grupa === 'narukvica' ? 'bg-sky-50 text-sky-700 ring-sky-200' : 'bg-rose-50 text-rose-700 ring-rose-200'}`}>
                                {s.grupa === 'narukvica' ? 'Narukvica' : 'Rever'}
                              </span>
                            </div>
                            <button onClick={() => removeStavka(s.id)}
                              className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                              title="Ukloni stavku">
                              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>

                          {/* Qty rows */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs text-gray-500 shrink-0">
                                <span>Muških</span>
                                <span className="text-gray-400 ml-1">({(s.cenaMuska ?? 0).toLocaleString('sr-RS')} RSD)</span>
                              </div>
                              <Stepper value={s.kolicinaMuskih ?? 0} onChange={v => updateQty(s.id, 'kolicinaMuskih', v)} />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs text-gray-500 shrink-0">
                                <span>Ženskih</span>
                                <span className="text-gray-400 ml-1">({(s.cenaZenska ?? 0).toLocaleString('sr-RS')} RSD)</span>
                              </div>
                              <Stepper value={s.kolicinaZenskih ?? 0} onChange={v => updateQty(s.id, 'kolicinaZenskih', v)} />
                            </div>
                          </div>

                          {/* Subtotals */}
                          {lineTotal > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                              {subtotalM > 0 && (
                                <span>{s.kolicinaMuskih} × {(s.cenaMuska ?? 0).toLocaleString('sr-RS')} = <span className="font-medium text-gray-600">{subtotalM.toLocaleString('sr-RS')} RSD</span></span>
                              )}
                              {subtotalZ > 0 && (
                                <span>{s.kolicinaZenskih} × {(s.cenaZenska ?? 0).toLocaleString('sr-RS')} = <span className="font-medium text-gray-600">{subtotalZ.toLocaleString('sr-RS')} RSD</span></span>
                              )}
                              <span className="ml-auto text-sm font-bold text-gray-900">{lineTotal.toLocaleString('sr-RS')} RSD</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Grand total */}
            {grandTotal > 0 && (
              <div className="mx-5 mb-4 mt-2 bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between border border-gray-200">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ukupno</span>
                <span className="text-xl font-bold text-gray-900">{grandTotal.toLocaleString('sr-RS')} RSD</span>
              </div>
            )}

            {/* Dashed add button */}
            <div className="px-5 pb-5">
              <button onClick={openAddModal}
                className="w-full py-3 border-2 border-dashed border-gray-300 hover:border-rose-400 hover:text-rose-600 text-gray-400 text-sm font-medium rounded-xl transition-all hover:bg-rose-50/50">
                + Dodaj stavku
              </button>
            </div>
          </div>

          {/* Customer comment */}
          {initialLead.komentar && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Komentar klijenta</h3>
              <blockquote className="border-l-4 border-rose-200 pl-4 py-1">
                <p className="text-sm text-gray-600 leading-relaxed italic">"{initialLead.komentar}"</p>
              </blockquote>
            </div>
          )}
        </div>

        {/* ── Right: notes + timeline ── */}
        <div className="flex flex-col gap-6">

          {/* Beleška */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Interna beleška</h3>
              {beleskaTs && (
                <span className="text-[11px] text-gray-400">
                  {relativeTime(beleskaTs)}
                </span>
              )}
            </div>
            <textarea
              value={beleska}
              onChange={e => { setBeleska(e.target.value); setBeleskaSaved(false) }}
              rows={6}
              placeholder="Beleška za internu upotrebu..."
              className="w-full px-3.5 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg outline-none resize-y focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
            />
            <button
              onClick={saveBeleska}
              disabled={savingBeleska}
              className={`mt-3 w-full py-2.5 text-sm font-semibold rounded-xl transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2
                ${beleskaSaved
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-900 hover:bg-gray-700 disabled:opacity-60 text-white'
                }`}
            >
              {savingBeleska
                ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Čuvanje...</>
                : beleskaSaved
                  ? <>✓ Sačuvano</>
                  : 'Sačuvaj belešku'
              }
            </button>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Istorija</h3>

            {loadingIstorija ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                {(istorija.length > 0 || true) && (
                  <div className="absolute left-[5px] top-2 bottom-2 w-px bg-gray-100" />
                )}
                <div className="flex flex-col gap-3.5">
                  {/* Firestore history entries */}
                  {istorija.map(entry => {
                    const cfg = HISTORY_CONFIG[entry.tip] ?? { dot: 'bg-gray-300', label: '' }
                    const isBeleska = entry.tip === 'beleska'
                    return (
                      <div key={entry.id} className="flex gap-3 relative">
                        <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} mt-0.5 shrink-0 z-10`} />
                        <div className="flex-1 min-w-0 -mt-0.5">
                          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                            {cfg.label} · {relativeTime(entry.datum)}
                          </p>
                          {isBeleska ? (
                            <blockquote className="border-l-2 border-amber-300 pl-2.5 py-0.5">
                              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">"{entry.opis}"</p>
                            </blockquote>
                          ) : (
                            <p className="text-xs text-gray-600 leading-snug">{entry.opis}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {/* Always-present creation entry */}
                  <div className="flex gap-3 relative">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-300 mt-0.5 shrink-0 z-10" />
                    <div className="flex-1 min-w-0 -mt-0.5">
                      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
                        Kreiran · {relativeTime(initialLead.kreirano)}
                      </p>
                      <p className="text-xs text-gray-600 leading-snug">Lead kreiran</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add stavka modal ── */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setShowAddModal(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="text-base font-semibold text-gray-900">Dodaj dekoraciju</h3>
              <button onClick={() => setShowAddModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all text-xl leading-none">
                ×
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {loadingDeko ? (
                <div className="flex justify-center py-10">
                  <div className="w-7 h-7 border-[3px] border-rose-100 border-t-rose-500 rounded-full animate-spin" />
                </div>
              ) : dekoracije.length === 0 ? (
                <p className="text-center py-10 text-gray-400 text-sm">Nema dekoracija.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {dekoracije.map(d => (
                    <button key={d.id} onClick={() => addStavka(d)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-rose-300 hover:bg-rose-50/40 transition-all text-left w-full group">
                      {d.slikeUrls?.[0] || d.slikaUrl
                        ? <img src={d.slikeUrls?.[0] || d.slikaUrl} alt={d.naziv} className="w-11 h-10 object-cover rounded-lg shrink-0 border border-gray-200" />
                        : <div className="w-11 h-10 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center text-gray-400 text-xs">—</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-rose-700 transition-colors">{d.naziv}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          M: {(d.cenaMuska ?? 0).toLocaleString('sr-RS')} · Ž: {(d.cenaZenska ?? 0).toLocaleString('sr-RS')} RSD
                        </p>
                      </div>
                      <span className={`shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded-full ring-1
                        ${d.grupa === 'narukvica' ? 'bg-sky-50 text-sky-700 ring-sky-200' : 'bg-rose-50 text-rose-700 ring-rose-200'}`}>
                        {d.grupa === 'narukvica' ? 'Narukvica' : 'Rever'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
