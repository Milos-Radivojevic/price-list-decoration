import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../firebase'
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore'
import Footer from '../components/Footer'
import Header from '../components/Header'

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconHand() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
      <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34L4 17" />
    </svg>
  )
}

function IconTruck() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
      <rect x="9" y="11" width="14" height="10" rx="2" />
      <circle cx="12" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#b87096">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

// ── Tag constants ─────────────────────────────────────────────────────────────
const TAG_STYLES = { novo: 'bg-blue-500/90 text-white', akcija: 'bg-red-500/90 text-white' }
const TAG_LABELS = { novo: 'Novo', akcija: 'Akcija' }

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const calcRef = useRef(null)
  const formRef = useRef(null)

  const [dekoracije, setDekoracije] = useState([])
  const [loadingDek, setLoadingDek] = useState(true)

  // Calculator
  const [muski, setMuski] = useState('')
  const [zenski, setZenski] = useState('')

  // Inquiry form
  const [form, setForm] = useState({ ime: '', telefon: '', email: '', datumVencanja: '', brojGostiju: '', poruka: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    document.title = 'Cvetići — Dekoracije za venčanja'
    async function load() {
      try {
        const snap = await getDocs(query(collection(db, 'dekoracije'), orderBy('redosled', 'asc')))
        setDekoracije(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch {
        // silently ignore load errors
      } finally {
        setLoadingDek(false)
      }
    }
    load()
  }, [])

  // Derived calculator values
  const decWithMuska = dekoracije.filter(d => (d.cenaMuska ?? 0) > 0)
  const decWithZenska = dekoracije.filter(d => (d.cenaZenska ?? 0) > 0)
  const avgMuska = decWithMuska.length
    ? Math.round(decWithMuska.reduce((s, d) => s + d.cenaMuska, 0) / decWithMuska.length)
    : 0
  const avgZenska = decWithZenska.length
    ? Math.round(decWithZenska.reduce((s, d) => s + d.cenaZenska, 0) / decWithZenska.length)
    : 0
  const totalEst = (parseInt(muski) || 0) * avgMuska + (parseInt(zenski) || 0) * avgZenska

  // Featured: novo/akcija first, up to 8
  const featured = [...dekoracije]
    .sort((a, b) => {
      const aP = a.tag === 'novo' || a.tag === 'akcija' ? 0 : 1
      const bP = b.tag === 'novo' || b.tag === 'akcija' ? 0 : 1
      return aP - bP
    })
    .slice(0, 8)

  function scrollTo(ref) {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: '' }))
  }

  function validateForm() {
    const e = {}
    if (!form.ime.trim()) e.ime = 'Obavezno polje'
    if (!form.telefon.trim()) e.telefon = 'Obavezno polje'
    if (!form.email.trim()) e.email = 'Obavezno polje'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Neispravna email adresa'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validateForm()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      await addDoc(collection(db, 'prijave'), {
        ime: form.ime.trim(),
        telefon: form.telefon.trim(),
        email: form.email.trim(),
        datumVencanja: form.datumVencanja || null,
        brojGostiju: form.brojGostiju ? parseInt(form.brojGostiju) : null,
        poruka: form.poruka.trim(),
        izvor: 'pocetna',
        procitano: false,
        kreirano: serverTimestamp(),
      })
      setSaved(true)
      setForm({ ime: '', telefon: '', email: '', datumVencanja: '', brojGostiju: '', poruka: '' })
    } finally {
      setSaving(false)
    }
  }

  const inputCls = (field) =>
    'w-full px-3 py-2.5 text-sm text-gray-900 bg-white rounded-lg outline-none focus:ring-2 transition-all border ' +
    (errors[field]
      ? 'border-red-400 ring-1 ring-red-200'
      : 'border-gray-300 focus:border-rose-400 focus:ring-rose-100')

  return (
    <div className="min-h-screen bg-white font-sans">

      <Header />

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-rose-50 via-rose-100 to-rose-50 py-20 sm:py-32 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-rose-200/25" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-rose-200/20" />
          <div className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full bg-rose-100/40" />
        </div>
        <div className="relative max-w-2xl mx-auto">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-rose-500 uppercase mb-5">
            Ručna izrada · Srbija
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 leading-tight mb-5">
            Cvetići za kićenje svatova
          </h1>
          <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-8 max-w-xl mx-auto">
            Ručno izrađene dekoracije za vaš najlepši dan. Pogledajte ponudu i izračunajte cenu odmah — potpuno besplatno.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/proizvodi"
              className="inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm px-6 py-3 rounded-lg transition-colors shadow-sm"
            >
              Pogledaj dekoracije
              <IconArrow />
            </Link>
            <button
              onClick={() => scrollTo(calcRef)}
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-rose-50 text-rose-700 font-semibold text-sm px-6 py-3 rounded-lg border border-rose-200 hover:border-rose-300 transition-colors"
            >
              Izračunaj cenu
            </button>
          </div>
        </div>
      </section>

      {/* ── 2. TRUST BAR ────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-7">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-0 sm:divide-x sm:divide-gray-100">
            {[
              { icon: <IconHand />, label: 'Ručna izrada', desc: 'Svaka dekoracija je jedinstvena' },
              { icon: <IconTruck />, label: 'Dostava po celoj Srbiji', desc: 'Šaljemo na vašu adresu' },
              { icon: <IconClock />, label: 'Odgovor za 24h', desc: 'Brza i ljubazna komunikacija' },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 sm:justify-center sm:px-8">
                <span className="text-rose-500 shrink-0">{icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. CATEGORIES ───────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Istražite naše kategorije</h2>
            <p className="text-sm text-gray-500">Izaberite kategoriju i pogledajte sve dekoracije</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Kićenje svatova',     search: 'Kićenje',    bg: 'bg-rose-100',  emoji: '💐' },
              { label: 'Devojačko veče',      search: 'Devojačko',  bg: 'bg-sky-100',   emoji: '✨' },
              { label: 'Crkvene dekoracije',  search: 'Crkven',     bg: 'bg-rose-50',   emoji: '⛪' },
              { label: 'Čaše i rekviziti',    search: 'Čaše',       bg: 'bg-gray-100',  emoji: '🥂' },
            ].map(({ label, search, bg, emoji }) => (
              <Link
                key={label}
                to="/proizvodi"
                state={{ initialSearch: search }}
                className="group flex flex-col items-center gap-3 bg-white rounded-xl p-5 border border-gray-100 hover:border-rose-200 hover:shadow-sm transition-all"
              >
                <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center text-2xl`}>
                  {emoji}
                </div>
                <span className="text-sm font-medium text-gray-800 text-center leading-snug group-hover:text-rose-700 transition-colors">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. CALCULATOR ───────────────────────────────────────────────────── */}
      <section ref={calcRef} id="kalkulator" className="py-14 sm:py-20 px-4 bg-white scroll-mt-16">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Izračunaj okvirnu cenu</h2>
            <p className="text-sm text-gray-500">Unesite broj gostiju i vidite okvirnu cenu odmah. Besplatno, bez obaveza.</p>
          </div>

          {loadingDek ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-[3px] border-rose-100 border-t-rose-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-rose-50 rounded-2xl p-6 sm:p-8">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Muški gosti
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={muski}
                    onChange={e => setMuski(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-rose-200 bg-white focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-colors"
                  />
                  {avgMuska > 0 && (
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      ~{avgMuska.toLocaleString('sr-RS')} RSD / gostu
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Ženski gosti
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={zenski}
                    onChange={e => setZenski(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 text-sm rounded-lg border border-rose-200 bg-white focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-colors"
                  />
                  {avgZenska > 0 && (
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      ~{avgZenska.toLocaleString('sr-RS')} RSD / gosci
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-rose-200 pt-5 mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Okvirna cena:</span>
                  <span className="text-xl font-bold text-rose-700">
                    {totalEst > 0 ? `${totalEst.toLocaleString('sr-RS')} RSD` : '—'}
                  </span>
                </div>
                {totalEst > 0 && (
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    Ovo je okvirna procena. Tačna cena zavisi od odabranih dekoracija.
                  </p>
                )}
              </div>

              <button
                onClick={() => scrollTo(formRef)}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm py-3 rounded-lg transition-colors"
              >
                Pošalji besplatan upit
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── 5. FEATURED DECORATIONS ─────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-8 gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Istaknute dekoracije</h2>
            <Link
              to="/proizvodi"
              className="shrink-0 text-sm font-medium text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors"
            >
              Pogledaj sve
              <IconArrow />
            </Link>
          </div>

          {loadingDek ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : featured.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">Nema dekoracija za prikaz</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {featured.map(d => {
                const cover = d.slikeUrls?.[0] || d.slikaUrl
                const tag = d.tag && TAG_STYLES[d.tag] ? d.tag : null
                const minPrice = Math.min(d.cenaMuska ?? 0, d.cenaZenska ?? 0)
                return (
                  <Link
                    key={d.id}
                    to="/proizvodi"
                    className="group bg-white rounded-xl border border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                      {cover ? (
                        <img
                          src={cover}
                          alt={d.naziv}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                          Nema slike
                        </div>
                      )}
                      {tag && (
                        <span className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm ${TAG_STYLES[tag]}`}>
                          {TAG_LABELS[tag]}
                        </span>
                      )}
                    </div>
                    <div className="p-3 flex flex-col gap-1.5">
                      <p className="text-xs sm:text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
                        {d.naziv}
                      </p>
                      {d.kolekcijaNaziv && (
                        <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded w-fit">
                          {d.kolekcijaNaziv}
                        </span>
                      )}
                      {minPrice > 0 && (
                        <p className="text-xs font-bold text-rose-600 mt-auto">
                          od {minPrice.toLocaleString('sr-RS')} RSD
                        </p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          <div className="text-center mt-8">
            <Link
              to="/proizvodi"
              className="inline-flex items-center gap-2 text-sm font-medium text-rose-600 hover:text-rose-700 transition-colors"
            >
              Pogledaj sve dekoracije
              <IconArrow />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 6. WHY CVETIĆI ──────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-10">Zašto Cvetići?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { emoji: '✋', title: 'Ručna izrada',           desc: 'Svaka dekoracija se radi sa pažnjom i ljubavlju' },
              { emoji: '🏠', title: 'Porodični biznis',       desc: 'Radimo sa srcem, ne kao fabrika' },
              { emoji: '💡', title: 'Prilagođavamo se vama', desc: 'Vaše ideje su naša inspiracija' },
              { emoji: '🚚', title: 'Brza dostava',           desc: 'Šaljemo na adresu po celoj Srbiji' },
            ].map(({ emoji, title, desc }) => (
              <div key={title} className="flex flex-col items-center gap-3 p-5 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-xl">
                  {emoji}
                </div>
                <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                <p className="text-xs text-gray-500 text-center leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 px-4 bg-rose-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-10">Kako funkcioniše?</h2>
          <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-0">
            {[
              { num: '1', title: 'Odaberi dekoracije',  desc: 'Pregledaj katalog i filtriraj po ceni, kolekciji i oznaci' },
              { num: '2', title: 'Izračunaj cenu',       desc: 'Unesite broj gostiju i dobijte okvirnu cenu odmah' },
              { num: '3', title: 'Pošalji upit',         desc: 'Mi odgovaramo u roku od jednog radnog dana. Sve besplatno.' },
            ].map(({ num, title, desc }, i) => (
              <>
                <div key={num} className="flex-1 flex flex-col items-center gap-3 px-4">
                  <div className="w-12 h-12 rounded-full bg-rose-600 text-white font-bold text-lg flex items-center justify-center shadow-sm">
                    {num}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-[180px] mx-auto">{desc}</p>
                </div>
                {i < 2 && (
                  <div key={`sep-${i}`} className="hidden sm:flex items-center justify-center pt-4 text-rose-300">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-10">Šta kažu naši klijenti</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                quote: 'Sve je bilo savršeno! Cvetići su bili prelepi i tačno onakvi kakvi smo zamislili.',
                name: 'Jovana M.',
                city: 'Niš',
              },
              {
                quote: 'Brza dostava, ljubazna komunikacija i fenomenalan kvalitet. Preporučujem svima!',
                name: 'Milica T.',
                city: 'Beograd',
              },
              {
                quote: 'Naručivala sam za devojačko veče i svadbu. Svaki put odlično!',
                name: 'Ana P.',
                city: 'Novi Sad',
              },
            ].map(({ quote, name, city }) => (
              <div key={name} className="bg-gray-50 border border-gray-100 rounded-xl p-6 text-left flex flex-col gap-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => <StarIcon key={i} />)}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed italic flex-1">"{quote}"</p>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{name}</p>
                  <p className="text-xs text-gray-400">{city}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. INQUIRY FORM ─────────────────────────────────────────────────── */}
      <section ref={formRef} id="upit" className="py-14 sm:py-20 px-4 bg-rose-50 scroll-mt-16">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Pošaljite besplatan upit</h2>
            <p className="text-sm text-gray-500">Odgovaramo u roku od jednog radnog dana.</p>
          </div>

          {saved ? (
            <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4 text-rose-600">
                <IconCheck />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1.5">Hvala! Kontaktiraćemo vas uskoro.</h3>
              <p className="text-sm text-gray-500">Odgovorićemo vam u roku od jednog radnog dana.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="bg-white rounded-xl border border-gray-100 p-6 sm:p-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Ime i prezime <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.ime}
                    onChange={e => setField('ime', e.target.value)}
                    className={inputCls('ime')}
                    placeholder="Jovana Petrović"
                  />
                  {errors.ime && <p className="text-xs text-red-500 mt-1">{errors.ime}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Telefon <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.telefon}
                    onChange={e => setField('telefon', e.target.value)}
                    className={inputCls('telefon')}
                    placeholder="+381 60 000 0000"
                  />
                  {errors.telefon && <p className="text-xs text-red-500 mt-1">{errors.telefon}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setField('email', e.target.value)}
                  className={inputCls('email')}
                  placeholder="jovana@primer.rs"
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Datum venčanja
                  </label>
                  <input
                    type="date"
                    value={form.datumVencanja}
                    onChange={e => setField('datumVencanja', e.target.value)}
                    className={inputCls('datumVencanja')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Broj gostiju
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.brojGostiju}
                    onChange={e => setField('brojGostiju', e.target.value)}
                    className={inputCls('brojGostiju')}
                    placeholder="100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Poruka</label>
                <textarea
                  rows={4}
                  value={form.poruka}
                  onChange={e => setField('poruka', e.target.value)}
                  className={inputCls('poruka') + ' resize-none'}
                  placeholder="Napišite šta vas zanima..."
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-semibold text-sm py-3 rounded-lg transition-colors"
              >
                {saving ? 'Slanje...' : 'Pošalji upit'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                Upit je potpuno besplatan i ne obavezuje vas ni na šta.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ── 10. FOOTER ──────────────────────────────────────────────────────── */}
      <Footer />
    </div>
  )
}
