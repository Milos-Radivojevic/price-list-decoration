import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Header from '../components/Header'
import { db } from '../firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import DecorationCard from '../components/DecorationCard'
import DecorationDetail from '../components/DecorationDetail'
import InterestModal from '../components/InterestModal'
import Footer from '../components/Footer'

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
  const location = useLocation()
  const [dekoracije, setDekoracije]   = useState([])
  const [kategorije, setKategorije]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState(location.state?.initialSearch || '')
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

        <Header />

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

      <Footer />

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
