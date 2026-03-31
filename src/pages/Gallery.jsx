import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '../firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'

function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
import DecorationCard from '../components/DecorationCard'
import DecorationDetail from '../components/DecorationDetail'
import InterestModal from '../components/InterestModal'

// ── Dual range slider ────────────────────────────────────────────────────────
function DualSlider({ min, max, low, high, onLow, onHigh }) {
  const trackRef = useRef(null)
  const dragging = useRef(null)

  if (min >= max) return null
  const range = max - min
  const pLow  = ((low  - min) / range) * 100
  const pHigh = ((high - min) / range) * 100

  function valueFromClientX(clientX) {
    const rect = trackRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(min + ratio * range)
  }

  function onPointerDown(e) {
    e.preventDefault()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const val = valueFromClientX(clientX)
    const distLow  = Math.abs(val - low)
    const distHigh = Math.abs(val - high)
    dragging.current = distLow <= distHigh ? 'low' : 'high'
    move(clientX)

    function move(cx) {
      const v = valueFromClientX(cx)
      if (dragging.current === 'low')  onLow(Math.min(v, high - 1))
      else                             onHigh(Math.max(v, low + 1))
    }

    function onMove(ev) { move(ev.touches ? ev.touches[0].clientX : ev.clientX) }
    function onUp() {
      dragging.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend',  onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend',  onUp)
  }

  return (
    <div
      ref={trackRef}
      className="relative h-8 flex items-center select-none cursor-pointer"
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
    >
      <div className="absolute inset-x-0 h-1.5 rounded-full bg-gray-200 pointer-events-none" />
      <div
        className="absolute h-1.5 rounded-full bg-rose-500 pointer-events-none"
        style={{ left: `${pLow}%`, right: `${100 - pHigh}%` }}
      />
      <div
        className="absolute top-1/2 w-4 h-4 -translate-y-1/2 -translate-x-1/2 bg-white border-2 border-rose-500 rounded-full shadow pointer-events-none"
        style={{ left: `${pLow}%`, zIndex: 8 }}
      />
      <div
        className="absolute top-1/2 w-4 h-4 -translate-y-1/2 -translate-x-1/2 bg-white border-2 border-rose-500 rounded-full shadow pointer-events-none"
        style={{ left: `${pHigh}%`, zIndex: 8 }}
      />
    </div>
  )
}

// ── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-square sm:aspect-[4/3] bg-gray-200" />
      <div className="p-3 sm:p-4 space-y-2.5">
        <div className="h-3.5 bg-gray-200 rounded-full w-3/4" />
        <div className="h-3 bg-gray-200 rounded-full w-1/2" />
        <div className="h-3 bg-gray-200 rounded-full w-2/3" />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

function cardMinPrice(d) {
  return Math.min(d.cenaMuska ?? 0, d.cenaZenska ?? 0)
}

export default function Gallery() {
  const [dekoracije, setDekoracije] = useState([])
  const [kolekcije, setKolekcije]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [activeTab, setActiveTab]   = useState('sve')
  const [priceMin, setPriceMin]     = useState(0)
  const [priceMax, setPriceMax]     = useState(10000)
  const [allMin, setAllMin]         = useState(0)
  const [allMax, setAllMax]         = useState(10000)
  const [detailItem, setDetailItem] = useState(null)
  const [interestItem, setInterestItem] = useState(null)
  const [interestCalc, setInterestCalc] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [priceOpen, setPriceOpen]   = useState(false)

  // Build tabs dynamically: "Sve" + one per kolekcija
  const TABS = [
    { key: 'sve', label: 'Sve' },
    ...kolekcije.map(k => ({ key: k.slug, label: k.naziv })),
  ]

  useEffect(() => {
    async function load() {
      try {
        const [dekSnap, kolSnap] = await Promise.all([
          getDocs(query(collection(db, 'dekoracije'), orderBy('redosled', 'asc'))),
          getDocs(query(collection(db, 'kolekcije'), orderBy('kreirano', 'asc'))),
        ])
        const all = dekSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        setDekoracije(all)
        setKolekcije(kolSnap.docs.map(d => ({ id: d.id, ...d.data() })))

        const prices = all.map(cardMinPrice).filter(p => p > 0)
        if (prices.length) {
          const mn = Math.min(...prices)
          const mx = Math.max(...prices)
          setAllMin(mn); setAllMax(mx)
          setPriceMin(mn); setPriceMax(mx)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = dekoracije.filter(d => {
    const q = search.trim().toLowerCase()
    if (q && !d.naziv.toLowerCase().includes(q)) return false
    if (activeTab !== 'sve' && d.grupa !== activeTab) return false
    const cp = cardMinPrice(d)
    if (cp < priceMin || cp > priceMax) return false
    return true
  })

  const hasFilters = search.trim() || activeTab !== 'sve' || priceMin !== allMin || priceMax !== allMax

  function resetFilters() {
    setSearch(''); setActiveTab('sve')
    setPriceMin(allMin); setPriceMax(allMax)
    setPriceOpen(false)
  }

  const openInterest = useCallback((dec, calcData) => {
    setInterestItem(dec)
    setInterestCalc(calcData ?? null)
  }, [])

  const showPriceSlider = allMax > allMin

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky wrapper: header + filter bar ── */}
      <div className="sticky top-0 z-30">

        {/* ── Navigation Header ── */}
        <header className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14 sm:h-16">

              {/* Logo */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-4.5 h-4.5 w-[18px] h-[18px]">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                  </svg>
                </div>
                <span className="text-base font-bold text-gray-900 tracking-tight">Cvetići</span>
              </div>

              {/* Desktop nav links */}
              <nav className="hidden md:flex items-center gap-7">
                <a href="#" className="text-sm font-medium text-gray-500 hover:text-rose-600 transition-colors">Početna</a>
                <a href="#proizvodi" className="text-sm font-medium text-rose-600">Proizvodi</a>
                <a href="#onama" className="text-sm font-medium text-gray-500 hover:text-rose-600 transition-colors">O nama</a>
                <a href="#kontakt" className="text-sm font-medium text-gray-500 hover:text-rose-600 transition-colors">Kontakt</a>
              </nav>

              {/* Desktop right: phone + instagram */}
              <div className="hidden md:flex items-center gap-5">
                <a
                  href="tel:+381693700575"
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-rose-600 transition-colors"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                    <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clipRule="evenodd" />
                  </svg>
                  +381 69 37 00 575
                </a>
                <a
                  href="https://www.instagram.com/cvetici.nis/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-rose-500 transition-colors"
                  aria-label="Instagram"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069ZM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z" />
                  </svg>
                </a>
              </div>

              {/* Mobile right: phone icon + instagram icon + hamburger */}
              <div className="flex md:hidden items-center gap-0.5">
                <a
                  href="tel:+381693700575"
                  className="p-2 text-gray-500 hover:text-rose-600 transition-colors"
                  aria-label="Pozovite nas"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clipRule="evenodd" />
                  </svg>
                </a>
                <a
                  href="https://www.instagram.com/cvetici.nis/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-500 hover:text-rose-500 transition-colors"
                  aria-label="Instagram"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069ZM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z" />
                  </svg>
                </a>
                <button
                  onClick={() => setMobileMenuOpen(v => !v)}
                  className="p-2 text-gray-500 hover:text-gray-800 transition-colors"
                  aria-label="Meni"
                >
                  {mobileMenuOpen ? (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile dropdown menu */}
            {mobileMenuOpen && (
              <div className="md:hidden border-t border-gray-100 py-2 flex flex-col">
                <a href="#" onClick={() => setMobileMenuOpen(false)}
                  className="px-2 py-2.5 text-sm font-medium text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                  Početna
                </a>
                <a href="#proizvodi" onClick={() => setMobileMenuOpen(false)}
                  className="px-2 py-2.5 text-sm font-medium text-rose-600 bg-rose-50 rounded-lg">
                  Proizvodi
                </a>
                <a href="#onama" onClick={() => setMobileMenuOpen(false)}
                  className="px-2 py-2.5 text-sm font-medium text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                  O nama
                </a>
                <a href="#kontakt" onClick={() => setMobileMenuOpen(false)}
                  className="px-2 py-2.5 text-sm font-medium text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                  Kontakt
                </a>
              </div>
            )}
          </div>
        </header>

        {/* ── Filter bar ── */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-3">

            {/* Row 1: search + count */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <svg viewBox="0 0 20 20" fill="currentColor"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Pretraži dekoracije..."
                  className="w-full pl-9 pr-3 py-2 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                />
                {search && (
                  <button onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full">
                    <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
                      <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                    </svg>
                  </button>
                )}
              </div>
              {!loading && (
                <span className="shrink-0 text-xs text-gray-500 whitespace-nowrap">
                  {filtered.length} {filtered.length === 1 ? 'dekoracija' : 'dekoracija'}
                </span>
              )}
            </div>

            {/* ── Mobile filter row (< sm) ── */}
            <div className="sm:hidden flex flex-col gap-2">
              {/* Collection pills — wrap freely */}
              <div className="flex flex-wrap gap-1.5">
                {TABS.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all
                      ${activeTab === t.key
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Price accordion */}
              {showPriceSlider && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setPriceOpen(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-white text-left"
                  >
                    <span className="text-xs font-medium text-gray-600">
                      Cena:{' '}
                      <span className={priceMin !== allMin || priceMax !== allMax ? 'text-rose-600 font-semibold' : 'text-gray-500'}>
                        {priceMin.toLocaleString('sr-RS')} – {priceMax.toLocaleString('sr-RS')} RSD
                      </span>
                    </span>
                    <svg
                      viewBox="0 0 20 20" fill="currentColor" width="16" height="16"
                      className={`text-gray-400 shrink-0 transition-transform duration-200 ${priceOpen ? 'rotate-180' : ''}`}
                    >
                      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {priceOpen && (
                    <div className="px-4 pb-3 pt-1 bg-gray-50 border-t border-gray-200">
                      <DualSlider
                        min={allMin} max={allMax}
                        low={priceMin} high={priceMax}
                        onLow={setPriceMin} onHigh={setPriceMax}
                      />
                    </div>
                  )}
                </div>
              )}

              {hasFilters && (
                <button onClick={resetFilters}
                  className="text-xs text-rose-600 hover:text-rose-800 font-medium transition-colors text-left">
                  Poništi filtere
                </button>
              )}
            </div>

            {/* ── Desktop filter row (sm+) ── */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex gap-1.5 flex-wrap">
                {TABS.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all
                      ${activeTab === t.key
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {showPriceSlider && <div className="w-px h-5 bg-gray-200 shrink-0" />}

              {showPriceSlider && (
                <div className="flex-1 min-w-[180px] max-w-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Cena</span>
                    <span className="text-[11px] text-gray-500">
                      {priceMin.toLocaleString('sr-RS')} – {priceMax.toLocaleString('sr-RS')} RSD
                    </span>
                  </div>
                  <DualSlider
                    min={allMin} max={allMax}
                    low={priceMin} high={priceMax}
                    onLow={setPriceMin} onHigh={setPriceMax}
                  />
                </div>
              )}

              {hasFilters && (
                <button onClick={resetFilters}
                  className="ml-auto text-xs text-rose-600 hover:text-rose-800 font-medium transition-colors whitespace-nowrap">
                  Poništi filtere
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Gallery grid ── */}
      <main id="proizvodi" className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-24">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                className="w-8 h-8 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            {hasFilters ? (
              <>
                <p className="text-sm font-medium text-gray-700 mb-1">Nema rezultata za vašu pretragu</p>
                <p className="text-xs text-gray-400 mb-5">Pokušajte da promenite filtere ili pretragu</p>
                <button onClick={resetFilters}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-xl transition-colors">
                  Poništi filtere
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-500">Trenutno nema dekoracija</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
            {filtered.map(d => (
              <DecorationCard
                key={d.id}
                decoration={d}
                onDetail={setDetailItem}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Detail panel ── */}
      {detailItem && (
        <DecorationDetail
          decoration={detailItem}
          onClose={() => setDetailItem(null)}
          onInterest={(dec, calcData) => {
            setInterestCalc(calcData ?? null)
            setInterestItem(dec)
          }}
        />
      )}

      {/* ── Inquiry modal ── */}
      {interestItem && (
        <InterestModal
          decoration={interestItem}
          kalkulatorData={interestCalc}
          onClose={() => { setInterestItem(null); setInterestCalc(null) }}
        />
      )}
    </div>
  )
}
