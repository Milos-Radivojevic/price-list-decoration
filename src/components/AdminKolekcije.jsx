import { useState, useEffect } from 'react'
import { db } from '../firebase'
import {
  collection, getDocs, addDoc, deleteDoc,
  doc, orderBy, query, serverTimestamp,
} from 'firebase/firestore'

function slugify(naziv) {
  return naziv.trim().toLowerCase().replace(/\s+/g, '-')
}

export default function AdminKolekcije() {
  const [kolekcije, setKolekcije] = useState([])
  const [loading, setLoading] = useState(true)
  const [newNaziv, setNewNaziv] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const q = query(collection(db, 'kolekcije'), orderBy('kreirano', 'asc'))
      const snap = await getDocs(q)
      setKolekcije(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    const naziv = newNaziv.trim()
    if (!naziv) return
    const slug = slugify(naziv)
    if (kolekcije.some(k => k.slug === slug)) {
      setError('Kolekcija sa tim imenom već postoji.')
      return
    }
    setError('')
    setAdding(true)
    try {
      await addDoc(collection(db, 'kolekcije'), { naziv, slug, kreirano: serverTimestamp() })
      setNewNaziv('')
      await load()
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Obrisati ovu kolekciju?')) return
    setDeletingId(id)
    try {
      await deleteDoc(doc(db, 'kolekcije', id))
      setKolekcije(prev => prev.filter(k => k.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900">Kolekcije</h2>
      </div>

      {/* Add form */}
      <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Dodaj novu kolekciju</h3>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newNaziv}
            onChange={e => { setNewNaziv(e.target.value); setError('') }}
            placeholder="Naziv kolekcije (npr. Privesci)"
            className="flex-1 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
          />
          <button
            type="submit"
            disabled={adding || !newNaziv.trim()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
          >
            {adding ? 'Dodaje se...' : '+ Dodaj'}
          </button>
        </form>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        <p className="text-xs text-gray-400 mt-2">
          Slug koji će se koristiti za filtriranje biće automatski generisan iz naziva.
        </p>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-[3px] border-rose-100 border-t-rose-500 rounded-full animate-spin" />
        </div>
      ) : kolekcije.length === 0 ? (
        <p className="text-center py-12 text-gray-400 text-sm">Nema kolekcija. Dodajte prvu!</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <div className="hidden sm:grid grid-cols-[1fr_160px_100px] gap-3 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Naziv</span>
            <span>Slug (ključ)</span>
            <span>Akcija</span>
          </div>
          <div className="divide-y divide-gray-200">
            {kolekcije.map(k => (
              <div key={k.id} className="flex sm:grid sm:grid-cols-[1fr_160px_100px] gap-3 px-6 py-4 items-center bg-white hover:bg-gray-50 transition-colors">
                <span className="font-medium text-gray-900">{k.naziv}</span>
                <span className="text-xs text-gray-400 font-mono hidden sm:block">{k.slug}</span>
                <div>
                  <button
                    onClick={() => handleDelete(k.id)}
                    disabled={deletingId === k.id}
                    title="Obriši kolekciju"
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {deletingId === k.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                    ) : (
                      <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
