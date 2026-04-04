import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, getDocs, addDoc, updateDoc, doc, orderBy, query, serverTimestamp } from 'firebase/firestore'

export default function AdminPrijave({ onConvertToLead }) {
  const [prijave, setPrijave] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(null) // prijava id awaiting confirm
  const [converting, setConverting] = useState(null) // prijava id being saved

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, 'prijave'), orderBy('kreirano', 'desc'))
        const snap = await getDocs(q)
        setPrijave(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function markAsRead(id) {
    await updateDoc(doc(db, 'prijave', id), { procitano: true })
    setPrijave(prev => prev.map(p => p.id === id ? { ...p, procitano: true } : p))
  }

  async function convertToLead(prijava) {
    setConverting(prijava.id)
    try {
      const data = {
        ime:      prijava.ime || '',
        telefon:  prijava.telefon || '',
        email:    prijava.email || '',
        komentar: prijava.komentar || prijava.poruka || '',
        stavke:   [],
        status:   'nova',
        kreirano:  serverTimestamp(),
        azurirano: serverTimestamp(),
        beleska:   '',
      }
      const ref = await addDoc(collection(db, 'lidovi'), data)
      const newLead = { id: ref.id, ...data, kreirano: new Date(), azurirano: new Date() }
      setConfirming(null)
      onConvertToLead?.(newLead)
    } finally {
      setConverting(null)
    }
  }

  function formatDate(ts) {
    if (!ts) return '—'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('sr-RS', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const unreadCount = prijave.filter(p => !p.procitano).length

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-[3px] border-rose-100 border-t-rose-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-lg font-bold text-gray-900">Prijave</h2>
        {unreadCount > 0 && (
          <span className="text-xs font-semibold bg-rose-600 text-white px-2.5 py-0.5 rounded-full">
            {unreadCount} novo
          </span>
        )}
      </div>

      {prijave.length === 0 ? (
        <p className="text-center py-16 text-gray-400 text-sm">Nema prijava.</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <div className="divide-y divide-gray-200">
          {prijave.map(p => (
            <div
              key={p.id}
              onClick={() => !p.procitano && markAsRead(p.id)}
              title={!p.procitano ? 'Kliknite da označite kao pročitano' : ''}
              className={`px-6 py-4 transition-colors
                ${!p.procitano
                  ? 'bg-rose-50/40 cursor-pointer hover:bg-rose-50'
                  : 'bg-white cursor-default hover:bg-gray-50'
                }`}
            >
              {/* Top row */}
              <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className={`text-sm text-gray-900 ${!p.procitano ? 'font-bold' : 'font-semibold'}`}>
                    {p.ime}
                  </span>
                  {!p.procitano && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  )}
                </div>
                <span className="text-xs text-gray-500">{formatDate(p.kreirano)}</span>
              </div>

              {/* Details */}
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm mb-3">
                <span className="text-gray-500">
                  <span className="font-medium text-gray-700">Dekoracija: </span>{p.dekoracijaNaziv}
                </span>
                <span className="text-gray-500">
                  <span className="font-medium text-gray-700">Tel: </span>{p.telefon}
                </span>
                <span className="text-gray-500">
                  <span className="font-medium text-gray-700">Email: </span>{p.email}
                </span>
              </div>

              {/* Calculator summary */}
              {p.kalkulatorUkupno > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-3 flex flex-col gap-1.5">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                    Kalkulacija
                  </p>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Muških: {p.kalkulatorMuskih} × {(p.kalkulatorCenaMuska ?? 0).toLocaleString('sr-RS')} RSD</span>
                    <span className="font-semibold text-gray-700">{(p.kalkulatorMuskih * p.kalkulatorCenaMuska).toLocaleString('sr-RS')} RSD</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Ženskih: {p.kalkulatorZenskih} × {(p.kalkulatorCenaZenska ?? 0).toLocaleString('sr-RS')} RSD</span>
                    <span className="font-semibold text-gray-700">{(p.kalkulatorZenskih * p.kalkulatorCenaZenska).toLocaleString('sr-RS')} RSD</span>
                  </div>
                  <div className="h-px bg-gray-200" />
                  <div className="flex justify-between text-sm font-bold text-gray-900">
                    <span>Ukupno</span>
                    <span>{p.kalkulatorUkupno.toLocaleString('sr-RS')} RSD</span>
                  </div>
                </div>
              )}

              {/* Comment */}
              {p.komentar && (
                <div className="bg-gray-50 border border-gray-200 border-l-2 border-l-rose-300 pl-3 py-2 pr-3 rounded-r-lg mb-3">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                    Pitanje / komentar
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">{p.komentar}</p>
                </div>
              )}

              {/* Actions row */}
              <div className="flex items-center gap-2 flex-wrap">
                {!p.procitano && (
                  <button
                    onClick={e => { e.stopPropagation(); markAsRead(p.id) }}
                    className="text-xs text-rose-600 border border-rose-200 hover:border-rose-400 hover:bg-rose-50 rounded-lg px-3 py-1.5 transition-all"
                  >
                    Označi kao pročitano
                  </button>
                )}

                {confirming === p.id ? (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5" onClick={e => e.stopPropagation()}>
                    <span className="text-xs text-amber-800 font-medium">Konvertovati u lid?</span>
                    <button
                      onClick={() => convertToLead(p)}
                      disabled={converting === p.id}
                      className="text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60 rounded px-2.5 py-1 transition-colors"
                    >
                      {converting === p.id ? 'Čuvanje...' : 'Potvrdi'}
                    </button>
                    <button
                      onClick={() => setConfirming(null)}
                      className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
                    >
                      Otkaži
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); setConfirming(p.id) }}
                    className="text-xs text-gray-600 border border-gray-200 hover:border-rose-300 hover:text-rose-700 hover:bg-rose-50 rounded-lg px-3 py-1.5 transition-all"
                  >
                    Konvertuj u lid →
                  </button>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  )
}
