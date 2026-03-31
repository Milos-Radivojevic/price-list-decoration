import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import { collection, getDocs, deleteDoc, doc, orderBy, query } from 'firebase/firestore'

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
      <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
    </svg>
  )
}

function getCoverUrl(d) {
  if (d.slikeUrls?.length) return d.slikeUrls[0]
  return d.slikaUrl || ''
}

export default function AdminDekoracije() {
  const navigate = useNavigate()
  const [dekoracije, setDekoracije] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

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

  return (
    <div>
      {/* Top row */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h2 className="text-lg font-bold text-gray-900">Dekoracije</h2>
        <button
          onClick={() => navigate('/admin/dekoracije/nova')}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          + Dodaj dekoraciju
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-[3px] border-rose-100 border-t-rose-500 rounded-full animate-spin" />
        </div>
      ) : dekoracije.length === 0 ? (
        <p className="text-center py-16 text-gray-400 text-sm">Nema dekoracija. Dodajte prvu!</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[56px_1fr_110px_110px_110px_88px] gap-3 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Slika</span>
            <span>Naziv</span>
            <span>Kolekcija</span>
            <span>Muška</span>
            <span>Ženska</span>
            <span>Akcije</span>
          </div>

          <div className="divide-y divide-gray-200">
            {dekoracije.map(d => {
              const cover = getCoverUrl(d)
              const imgCount = d.slikeUrls?.length || (d.slikaUrl ? 1 : 0)
              const grpLabel = d.grupa
                ? d.grupa.charAt(0).toUpperCase() + d.grupa.slice(1)
                : '—'

              return (
                <div
                  key={d.id}
                  onClick={() => navigate(`/admin/dekoracije/${d.id}`)}
                  className="flex sm:grid sm:grid-cols-[56px_1fr_110px_110px_110px_88px] gap-3 px-6 py-4 items-center bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                >
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
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 bg-rose-50 text-rose-700 ring-rose-200">
                        {grpLabel}
                      </span>
                      <span className="text-xs text-rose-600 font-semibold">
                        M: {d.cenaMuska?.toLocaleString('sr-RS')} · Ž: {d.cenaZenska?.toLocaleString('sr-RS')} RSD
                      </span>
                    </div>
                  </div>

                  {/* Kolekcija (desktop) */}
                  <span className="hidden sm:inline text-[11px] font-medium px-2 py-0.5 rounded-full ring-1 w-fit bg-rose-50 text-rose-700 ring-rose-200">
                    {grpLabel}
                  </span>

                  {/* Prices (desktop) */}
                  <span className="hidden sm:block text-rose-600 font-semibold text-xs">
                    {d.cenaMuska?.toLocaleString('sr-RS')} RSD
                  </span>
                  <span className="hidden sm:block text-rose-600 font-semibold text-xs">
                    {d.cenaZenska?.toLocaleString('sr-RS')} RSD
                  </span>

                  {/* Actions — stop propagation so clicking delete doesn't navigate */}
                  <div className="shrink-0 flex gap-2" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/admin/dekoracije/${d.id}`)}
                      title="Izmeni"
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
                      disabled={deletingId === d.id}
                      title="Obriši"
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === d.id
                        ? <div className="w-3.5 h-3.5 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                        : <TrashIcon />
                      }
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
