import { useState, useEffect } from 'react'
import { db } from '../firebase'
import {
  collection, getDocs, addDoc, deleteDoc,
  doc, orderBy, query, serverTimestamp,
} from 'firebase/firestore'

function slugify(s) {
  return s.trim().toLowerCase().replace(/\s+/g, '-')
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
    </svg>
  )
}
function ChevronIcon({ open }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"
      className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
      <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  )
}

export default function AdminKategorije() {
  const [kategorije, setKategorije] = useState([])  // [{id, naziv, kolekcije:[{id,naziv,slug}]}]
  const [loading, setLoading]       = useState(true)
  const [expanded, setExpanded]     = useState({})  // {katId: bool}

  // Add category
  const [newKatNaziv, setNewKatNaziv] = useState('')
  const [addingKat, setAddingKat]     = useState(false)
  const [katError, setKatError]       = useState('')

  // Delete category
  const [deletingKatId, setDeletingKatId] = useState(null)

  // Add collection (per category)
  const [newKolInput, setNewKolInput] = useState({})  // {katId: string}
  const [addingKolId, setAddingKolId] = useState(null)

  // Delete collection
  const [deletingKolKey, setDeletingKolKey] = useState(null)  // "katId/kolId"

  async function load() {
    setLoading(true)
    try {
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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAddKat(e) {
    e.preventDefault()
    const naziv = newKatNaziv.trim()
    if (!naziv) return
    if (kategorije.some(k => k.naziv.toLowerCase() === naziv.toLowerCase())) {
      setKatError('Kategorija sa tim imenom već postoji.'); return
    }
    setKatError(''); setAddingKat(true)
    try {
      const ref = await addDoc(collection(db, 'kategorije'), { naziv, kreirano: serverTimestamp() })
      const newKat = { id: ref.id, naziv, kolekcije: [] }
      setKategorije(prev => [...prev, newKat])
      setNewKatNaziv('')
      setExpanded(ex => ({ ...ex, [ref.id]: true }))
    } finally {
      setAddingKat(false)
    }
  }

  async function handleDeleteKat(katId) {
    if (!confirm('Obrisati ovu kategoriju i sve njene kolekcije?')) return
    setDeletingKatId(katId)
    try {
      const kat = kategorije.find(k => k.id === katId)
      await Promise.all(
        (kat?.kolekcije || []).map(kol =>
          deleteDoc(doc(db, 'kategorije', katId, 'kolekcije', kol.id))
        )
      )
      await deleteDoc(doc(db, 'kategorije', katId))
      setKategorije(prev => prev.filter(k => k.id !== katId))
    } finally {
      setDeletingKatId(null)
    }
  }

  async function handleAddKol(e, katId) {
    e.preventDefault()
    const naziv = (newKolInput[katId] || '').trim()
    if (!naziv) return
    const slug = slugify(naziv)
    setAddingKolId(katId)
    try {
      const ref = await addDoc(
        collection(db, 'kategorije', katId, 'kolekcije'),
        { naziv, slug, kreirano: serverTimestamp() }
      )
      const newKol = { id: ref.id, naziv, slug }
      setKategorije(prev => prev.map(k =>
        k.id === katId ? { ...k, kolekcije: [...k.kolekcije, newKol] } : k
      ))
      setNewKolInput(prev => ({ ...prev, [katId]: '' }))
    } finally {
      setAddingKolId(null)
    }
  }

  async function handleDeleteKol(katId, kolId) {
    if (!confirm('Obrisati ovu kolekciju?')) return
    const key = `${katId}/${kolId}`
    setDeletingKolKey(key)
    try {
      await deleteDoc(doc(db, 'kategorije', katId, 'kolekcije', kolId))
      setKategorije(prev => prev.map(k =>
        k.id === katId ? { ...k, kolekcije: k.kolekcije.filter(c => c.id !== kolId) } : k
      ))
    } finally {
      setDeletingKolKey(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900">Kategorije</h2>
      </div>

      {/* ── Add category form ── */}
      <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Dodaj novu kategoriju</h3>
        <form onSubmit={handleAddKat} className="flex gap-2">
          <input
            type="text" value={newKatNaziv}
            onChange={e => { setNewKatNaziv(e.target.value); setKatError('') }}
            placeholder="Naziv kategorije (npr. Reveri, Narukvice...)"
            className="flex-1 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
          />
          <button type="submit" disabled={addingKat || !newKatNaziv.trim()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap">
            {addingKat ? 'Dodaje...' : '+ Dodaj'}
          </button>
        </form>
        {katError && <p className="text-xs text-red-500 mt-2">{katError}</p>}
      </div>

      {/* ── Category list ── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-[3px] border-rose-100 border-t-rose-500 rounded-full animate-spin" />
        </div>
      ) : kategorije.length === 0 ? (
        <p className="text-center py-12 text-gray-400 text-sm">Nema kategorija. Dodajte prvu!</p>
      ) : (
        <div className="flex flex-col gap-3">
          {kategorije.map(kat => {
            const isOpen = !!expanded[kat.id]
            const isDeletingKat = deletingKatId === kat.id
            return (
              <div key={kat.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {/* Category header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <button
                    onClick={() => setExpanded(ex => ({ ...ex, [kat.id]: !isOpen }))}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <ChevronIcon open={isOpen} />
                    <span className="text-sm font-semibold text-gray-900">{kat.naziv}</span>
                    <span className="text-xs text-gray-400 font-normal">
                      ({kat.kolekcije.length} {kat.kolekcije.length === 1 ? 'kolekcija' : 'kolekcija'})
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteKat(kat.id)}
                    disabled={isDeletingKat}
                    title="Obriši kategoriju"
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-40 shrink-0"
                  >
                    {isDeletingKat
                      ? <div className="w-3 h-3 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                      : <TrashIcon />
                    }
                  </button>
                </div>

                {/* Collections list + add form (expanded) */}
                {isOpen && (
                  <div className="p-4 flex flex-col gap-3">
                    {kat.kolekcije.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Nema kolekcija u ovoj kategoriji.</p>
                    ) : (
                      <div className="flex flex-col divide-y divide-gray-100">
                        {kat.kolekcije.map(kol => {
                          const delKey = `${kat.id}/${kol.id}`
                          return (
                            <div key={kol.id} className="flex items-center justify-between py-2">
                              <div>
                                <span className="text-sm text-gray-800">{kol.naziv}</span>
                                <span className="ml-2 text-[11px] text-gray-400 font-mono">{kol.slug}</span>
                              </div>
                              <button
                                onClick={() => handleDeleteKol(kat.id, kol.id)}
                                disabled={deletingKolKey === delKey}
                                title="Obriši kolekciju"
                                className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-40 shrink-0"
                              >
                                {deletingKolKey === delKey
                                  ? <div className="w-3 h-3 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                                  : <TrashIcon />
                                }
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Add collection form */}
                    <form onSubmit={e => handleAddKol(e, kat.id)} className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={newKolInput[kat.id] || ''}
                        onChange={e => setNewKolInput(prev => ({ ...prev, [kat.id]: e.target.value }))}
                        placeholder="Naziv kolekcije (npr. Rever klasik)"
                        className="flex-1 px-3 py-1.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                      />
                      <button
                        type="submit"
                        disabled={addingKolId === kat.id || !(newKolInput[kat.id] || '').trim()}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                      >
                        {addingKolId === kat.id ? '...' : '+ Kolekcija'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
