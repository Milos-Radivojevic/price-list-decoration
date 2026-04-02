import { useState, useEffect, useCallback, useRef } from 'react'
import { db } from '../firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import DecorationCard from '../components/DecorationCard'
import DecorationDetail from '../components/DecorationDetail'
import InterestModal from '../components/InterestModal'

// ── Dual range slider ────────────────────────────────────────────────────────
function DualSlider({ min, max, low, high, onLow, onHigh }) {
  const trackRef = useRef(null)
  const dragging = useRef(null)

  if (min >= max) return (
    <p className="text-xs text-gray-400 text-center py-1">Sve dekoracije imaju istu cenu</p>
  )
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

// ── Price dropdown ────────────────────────────────────────────────────────────
function PriceDropdown({ allMin, allMax, priceMin, priceMax, onMin, onMax, onReset }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const isFiltered = priceMin !== allMin || priceMax !== allMax

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className={`h-[34px] flex items-center gap-1.5 px-3 border rounded text-xs font-medium transition-all whitespace-nowrap
          ${isFiltered
            ? 'border-rose-400 bg-rose-50 text-rose-700'
            : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
          }`}
        style={{ borderRadius: 4 }}
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13" className="shrink-0">
          <path strokeLinecap="round" d="M2 4h12M4 8h8M6 12h4" />
        </svg>
        <span>
          {isFiltered
            ? `${priceMin.toLocaleString('sr-RS')} – ${priceMax.toLocaleString('sr-RS')} RSD`
            : 'Cena'
          }
        </span>
        <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12"
          className={`shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-64">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Opseg cene</span>
            {isFiltered && (
              <button onClick={() => { onReset(); setOpen(false) }}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-medium">
                Resetuj
              </button>
            )}
          </div>
          <div className="text-xs text-gray-500 mb-2 text-center">
            {priceMin.toLocaleString('sr-RS')} – {priceMax.toLocaleString('sr-RS')} RSD
          </div>
          <DualSlider
            min={allMin} max={allMax}
            low={priceMin} high={priceMax}
            onLow={onMin} onHigh={onMax}
          />
        </div>
      )}
    </div>
  )
}

// ── Sort options ─────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'redosled',    label: 'Popularno'           },
  { value: 'cena_asc',   label: 'Cena: od najjeftinije' },
  { value: 'cena_desc',  label: 'Cena: od najskuplje'  },
  { value: 'novo',       label: 'Zadnje ubačeno'       },
]

function cardMinPrice(d) {
  return Math.min(d.cenaMuska ?? 0, d.cenaZenska ?? 0)
}

function applySorting(list, sort) {
  const arr = [...list]
  switch (sort) {
    case 'cena_asc':
      return arr.sort((a, b) => cardMinPrice(a) - cardMinPrice(b))
    case 'cena_desc':
      return arr.sort((a, b) => cardMinPrice(b) - cardMinPrice(a))
    case 'novo':
      return arr.sort((a, b) => {
        const ta = a.kreirano?.seconds ?? 0
        const tb = b.kreirano?.seconds ?? 0
        return tb - ta
      })
    case 'redosled':
    default:
      return arr.sort((a, b) => (a.redosled ?? 0) - (b.redosled ?? 0))
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Gallery() {
  const [dekoracije, setDekoracije]   = useState([])
  const [kategorije, setKategorije]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [activeKat, setActiveKat]     = useState('')
  const [activeTab, setActiveTab]     = useState('sve')
  const [priceMin, setPriceMin]       = useState(0)
  const [priceMax, setPriceMax]       = useState(10000)
  const [allMin, setAllMin]           = useState(0)
  const [allMax, setAllMax]           = useState(10000)
  const [sort, setSort]               = useState('redosled')
  const [detailItem, setDetailItem]   = useState(null)
  const [interestItem, setInterestItem] = useState(null)
  const [interestCalc, setInterestCalc] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Only show collection tabs for collections that have at least one decoration
  const usedGrupe = new Set(dekoracije.map(d => d.grupa).filter(Boolean))

  const visibleKols = (activeKat
    ? (kategorije.find(k => k.id === activeKat)?.kolekcije || [])
    : kategorije.flatMap(k => k.kolekcije)
  ).filter(k => usedGrupe.has(k.slug))

  const TABS = [
    { key: 'sve', label: 'Sve' },
    ...visibleKols.map(k => ({ key: k.slug, label: k.naziv })),
  ]

  useEffect(() => {
    async function load() {
      try {
        const [dekSnap, katSnap] = await Promise.all([
          getDocs(query(collection(db, 'dekoracije'), orderBy('redosled', 'asc'))),
          getDocs(query(collection(db, 'kategorije'), orderBy('kreirano', 'asc'))),
        ])
        const all = dekSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        setDekoracije(all)

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

        const prices = all.flatMap(d => [d.cenaMuska ?? 0, d.cenaZenska ?? 0]).filter(p => p > 0)
        if (prices.length) {
          const mn = Math.min(...prices); const mx = Math.max(...prices)
          setAllMin(mn); setAllMax(mx); setPriceMin(mn); setPriceMax(mx)
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
    if (activeKat && d.kategorijaId !== activeKat) return false
    if (activeTab !== 'sve' && d.grupa !== activeTab) return false
    const cp = cardMinPrice(d)
    if (cp < priceMin || cp > priceMax) return false
    return true
  })

  const sorted = applySorting(filtered, sort)
  const hasFilters = search.trim() || activeKat !== '' || activeTab !== 'sve' || priceMin !== allMin || priceMax !== allMax

  function resetFilters() {
    setSearch(''); setActiveKat(''); setActiveTab('sve')
    setPriceMin(allMin); setPriceMax(allMax)
  }

  const openInterest = useCallback((dec, calcData) => {
    setInterestItem(dec); setInterestCalc(calcData ?? null)
  }, [])

  const showPriceDropdown = allMax > 0

  // Shared pill style
  const pillCls = (active) =>
    `h-[34px] px-3 flex items-center text-xs font-medium transition-all whitespace-nowrap border`
    + (active
      ? ' bg-rose-600 text-white border-rose-600 shadow-sm'
      : ' bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:text-gray-800')

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky wrapper ── */}
      <div className="sticky top-0 z-30">

        {/* ── Navigation Header ── */}
        <header className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14 sm:h-16">

              {/* Logo */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                    <line x1="1.5" y1="22.5" x2="22.5" y2="22.5"/>
                    <line x1="6" y1="22.5" x2="6" y2="12"/>
                    <line x1="18" y1="22.5" x2="18" y2="12"/>
                    <path d="M6 12 A6 6 0 0 1 18 12"/>
                    <circle cx="14.5" cy="17" r="2.3"/>
                    <circle cx="2.5" cy="20" r="2"/>
                    <circle cx="4.5" cy="18.5" r="2"/>
                    <circle cx="2" cy="18" r="1.8"/>
                    <circle cx="2.5" cy="14.5" r="1.8"/>
                    <circle cx="4.5" cy="13" r="1.8"/>
                    <circle cx="2" cy="13" r="1.6"/>
                    <circle cx="3.5" cy="9.5" r="1.7"/>
                    <circle cx="6" cy="8" r="1.7"/>
                    <circle cx="3" cy="8.5" r="1.5"/>
                  </svg>
                </div>
                <span className="text-base font-bold text-gray-900 tracking-tight">Cvetići</span>
              </div>

              {/* Desktop nav */}
              <nav className="hidden md:flex items-center gap-7">
                <a href="#" className="text-sm font-medium text-gray-500 hover:text-rose-600 transition-colors">Početna</a>
                <a href="#proizvodi" className="text-sm font-medium text-rose-600">Proizvodi</a>
                <a href="#onama" className="text-sm font-medium text-gray-500 hover:text-rose-600 transition-colors">O nama</a>
                <a href="#kontakt" className="text-sm font-medium text-gray-500 hover:text-rose-600 transition-colors">Kontakt</a>
              </nav>

              {/* Desktop right */}
              <div className="hidden md:flex items-center gap-5">
                <a href="tel:+381693700575"
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-rose-600 transition-colors">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                    <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clipRule="evenodd" />
                  </svg>
                  +381 69 37 00 575
                </a>
                <a href="https://www.instagram.com/cvetici.nis/" target="_blank" rel="noopener noreferrer"
                  className="text-gray-500 hover:text-rose-500 transition-colors" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069ZM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z" />
                  </svg>
                </a>
              </div>

              {/* Mobile right */}
              <div className="flex md:hidden items-center gap-0.5">
                <a href="tel:+381693700575" className="p-2 text-gray-500 hover:text-rose-600 transition-colors" aria-label="Pozovite nas">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="https://www.instagram.com/cvetici.nis/" target="_blank" rel="noopener noreferrer"
                  className="p-2 text-gray-500 hover:text-rose-500 transition-colors" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069ZM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z" />
                  </svg>
                </a>
                <button onClick={() => setMobileMenuOpen(v => !v)}
                  className="p-2 text-gray-500 hover:text-gray-800 transition-colors" aria-label="Meni">
                  {mobileMenuOpen
                    ? <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                    : <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" /></svg>
                  }
                </button>
              </div>
            </div>

            {/* Mobile nav dropdown */}
            {mobileMenuOpen && (
              <div className="md:hidden border-t border-gray-100 py-2 flex flex-col">
                <a href="#" onClick={() => setMobileMenuOpen(false)} className="px-2 py-2.5 text-sm font-medium text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">Početna</a>
                <a href="#proizvodi" onClick={() => setMobileMenuOpen(false)} className="px-2 py-2.5 text-sm font-medium text-rose-600 bg-rose-50 rounded-lg">Proizvodi</a>
                <a href="#onama" onClick={() => setMobileMenuOpen(false)} className="px-2 py-2.5 text-sm font-medium text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">O nama</a>
                <a href="#kontakt" onClick={() => setMobileMenuOpen(false)} className="px-2 py-2.5 text-sm font-medium text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">Kontakt</a>
              </div>
            )}
          </div>
        </header>

        {/* ── Filter bar ── */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">

            {/* ── Desktop single row (sm+) ── */}
            <div className="hidden sm:flex items-center gap-2">
              {/* Kategorija dropdown */}
              <select
                value={activeKat}
                onChange={e => { setActiveKat(e.target.value); setActiveTab('sve') }}
                className="h-[34px] pl-2.5 pr-7 text-xs text-gray-600 bg-white border border-gray-300 outline-none hover:border-gray-400 transition-colors appearance-none cursor-pointer shrink-0"
                style={{ borderRadius: 4, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%236b7280'%3E%3Cpath fill-rule='evenodd' d='M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z' clip-rule='evenodd'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '14px' }}
              >
                <option value="">Kategorija</option>
                {kategorije.map(k => (
                  <option key={k.id} value={k.id}>{k.naziv}</option>
                ))}
              </select>

              {/* Search */}
              <div className="relative flex-1 min-w-0">
                <svg viewBox="0 0 20 20" fill="currentColor"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                </svg>
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Pretraži..."
                  className="w-full h-[34px] pl-8 pr-3 text-xs text-gray-900 bg-gray-50 border border-gray-300 outline-none focus:bg-white focus:border-rose-400 focus:ring-1 focus:ring-rose-100 transition-all"
                  style={{ borderRadius: 4 }}
                />
                {search && (
                  <button onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-700">
                    <svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11">
                      <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Collection tabs */}
              <div className="flex items-center">
                {TABS.map((t, i) => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    style={{
                      borderRadius: i === 0 ? '4px 0 0 4px' : i === TABS.length - 1 ? '0 4px 4px 0' : '0',
                      marginLeft: i === 0 ? 0 : -1,
                    }}
                    className={pillCls(activeTab === t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Price dropdown */}
              {showPriceDropdown && (
                <PriceDropdown
                  allMin={allMin} allMax={allMax}
                  priceMin={priceMin} priceMax={priceMax}
                  onMin={setPriceMin} onMax={setPriceMax}
                  onReset={() => { setPriceMin(allMin); setPriceMax(allMax) }}
                />
              )}

              {hasFilters && (
                <button onClick={resetFilters}
                  className="shrink-0 text-xs text-rose-600 hover:text-rose-800 font-medium transition-colors whitespace-nowrap">
                  Poništi
                </button>
              )}
            </div>

            {/* ── Mobile filter rows (< sm) ── */}
            <div className="sm:hidden flex flex-col gap-2">
              {/* Row 1: Kategorija + Search side by side */}
              <div className="flex gap-2">
                <select
                  value={activeKat}
                  onChange={e => { setActiveKat(e.target.value); setActiveTab('sve') }}
                  className="h-[38px] pl-2.5 pr-6 text-xs text-gray-600 bg-white border border-gray-300 outline-none appearance-none cursor-pointer shrink-0 w-[42%]"
                  style={{ borderRadius: 6, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%236b7280'%3E%3Cpath fill-rule='evenodd' d='M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z' clip-rule='evenodd'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '12px' }}
                >
                  <option value="">Kategorija</option>
                  {kategorije.map(k => (
                    <option key={k.id} value={k.id}>{k.naziv}</option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <svg viewBox="0 0 20 20" fill="currentColor"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none">
                    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                  </svg>
                  <input
                    type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Pretraži..."
                    className="w-full h-[38px] pl-8 pr-3 text-xs text-gray-900 bg-gray-50 border border-gray-300 outline-none focus:bg-white focus:border-rose-400 focus:ring-1 focus:ring-rose-100 transition-all"
                    style={{ borderRadius: 6 }}
                  />
                  {search && (
                    <button onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-700">
                      <svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11">
                        <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: Tabs (scrollable) + Cena outside overflow */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-[0px] overflow-x-auto scrollbar-none flex-1">
                  {TABS.map((t, i) => (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      style={{
                        borderRadius: i === 0 ? '4px 0 0 4px' : i === TABS.length - 1 ? '0 4px 4px 0' : '0',
                        marginLeft: i === 0 ? 0 : -1,
                      }}
                      className={`${pillCls(activeTab === t.key)} shrink-0`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {showPriceDropdown && (
                  <PriceDropdown
                    allMin={allMin} allMax={allMax}
                    priceMin={priceMin} priceMax={priceMax}
                    onMin={setPriceMin} onMax={setPriceMax}
                    onReset={() => { setPriceMin(allMin); setPriceMax(allMax) }}
                  />
                )}
              </div>

              {hasFilters && (
                <button onClick={resetFilters}
                  className="text-xs text-rose-600 hover:text-rose-800 font-medium transition-colors text-left">
                  Poništi filtere
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Gallery grid ── */}
      <main id="proizvodi" className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">

        {/* H1 + results + sort row */}
        <div className="flex items-start justify-between gap-3 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3">
            <h1 className="text-base sm:text-xl font-bold text-gray-900 tracking-tight">
              Cvetići za kićenje svatova
            </h1>
            {!loading && (
              <span className="text-xs sm:text-sm text-gray-400">
                {sorted.length} {sorted.length === 1 ? 'rezultat' : 'rezultata'}
              </span>
            )}
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="shrink-0 h-[32px] sm:h-[36px] pl-2 sm:pl-3 pr-6 sm:pr-8 text-xs sm:text-sm text-gray-700 bg-white border border-gray-300 outline-none hover:border-gray-400 transition-colors appearance-none cursor-pointer rounded-lg"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%236b7280'%3E%3Cpath fill-rule='evenodd' d='M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z' clip-rule='evenodd'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '13px' }}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-gray-400">
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
            {sorted.map(d => (
              <DecorationCard key={d.id} decoration={d} onDetail={setDetailItem} />
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
