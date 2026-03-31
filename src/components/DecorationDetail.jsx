import { useState, useEffect, useRef } from 'react'

function getImages(d) {
  if (d.slikeUrls?.length) return d.slikeUrls
  if (d.slikaUrl) return [d.slikaUrl]
  return []
}

// ── Image carousel ──────────────────────────────────────────────────────────
function ImageCarousel({ images }) {
  const [idx, setIdx] = useState(0)
  const touchStartX = useRef(null)
  const count = images.length

  function prev() { setIdx(i => (i - 1 + count) % count) }
  function next() { setIdx(i => (i + 1) % count) }

  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx < -40) next()
    else if (dx > 40) prev()
    touchStartX.current = null
  }

  if (!count) {
    return (
      <div className="w-full aspect-[4/3] bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm">
        Nema slike
      </div>
    )
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl bg-gray-100 select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slide strip */}
      <div
        className="flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {images.map((url, i) => (
          <div key={i} className="w-full shrink-0 aspect-[4/3]">
            <img src={url} alt={`Slika ${i + 1}`} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>

      {/* Arrows */}
      {count > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors backdrop-blur-sm"
            aria-label="Prethodna slika"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors backdrop-blur-sm"
            aria-label="Sledeća slika"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Dots */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all duration-200 ${i === idx ? 'bg-white w-4' : 'bg-white/55 w-1.5'}`}
                aria-label={`Slika ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Stepper ─────────────────────────────────────────────────────────────────
function Stepper({ value, onChange }) {
  function set(n) { onChange(Math.max(0, n)) }
  function handleInput(e) {
    const n = parseInt(e.target.value, 10)
    set(isNaN(n) ? 0 : n)
  }
  return (
    <div className="flex items-center border border-rose-200 rounded-lg overflow-hidden bg-white">
      <button type="button" onClick={() => set(value - 1)}
        className="w-9 h-9 shrink-0 flex items-center justify-center bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 text-lg font-medium transition-colors"
        aria-label="Smanji">−</button>
      <input type="number" min="0" value={value} onChange={handleInput}
        className="flex-1 min-w-0 h-9 text-center text-sm font-semibold text-gray-900 bg-white border-x border-rose-200 outline-none"
        aria-label="Količina"
      />
      <button type="button" onClick={() => set(value + 1)}
        className="w-9 h-9 shrink-0 flex items-center justify-center bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 text-lg font-medium transition-colors"
        aria-label="Povećaj">+</button>
    </div>
  )
}

export default function DecorationDetail({ decoration, onClose, onInterest }) {
  const [visible, setVisible] = useState(false)
  const [qMuska, setQMuska]   = useState(0)
  const [qZenska, setQZenska] = useState(0)

  useEffect(() => {
    setQMuska(0)
    setQZenska(0)
  }, [decoration.id])

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const cenaMuska   = decoration.cenaMuska ?? 0
  const cenaZenska  = decoration.cenaZenska ?? 0
  const subtotalMuska  = qMuska  * cenaMuska
  const subtotalZenska = qZenska * cenaZenska
  const total = subtotalMuska + subtotalZenska
  const hasQty = qMuska > 0 || qZenska > 0

  const images = getImages(decoration)

  return (
    <div
      className={`fixed inset-0 z-40 transition-colors duration-300 ${visible ? 'bg-black/50' : 'bg-transparent'}`}
      onClick={handleClose}
    >
      {/* Panel: bottom sheet on mobile, right panel on desktop */}
      <div
        className={`fixed bottom-0 left-0 right-0 max-h-[90vh]
          md:top-0 md:left-auto md:bottom-0 md:w-[45%] md:min-w-[380px] md:max-w-xl md:max-h-none
          bg-white flex flex-col overflow-y-auto rounded-t-2xl md:rounded-none shadow-2xl
          transition-transform duration-300 ease-out
          ${visible ? 'panel-enter-active' : 'panel-enter'}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile drag handle */}
        <div className="md:hidden w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-1 shrink-0" />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all shadow-sm"
          aria-label="Zatvori"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>

        {/* Image carousel with padding */}
        <div className="px-4 sm:px-5 pt-4 sm:pt-5 shrink-0">
          <ImageCarousel images={images} />
        </div>

        {/* Content */}
        <div className="flex flex-col gap-5 p-5 md:p-6 flex-1">
          {/* Category badge + title */}
          <div>
            <span className={`inline-block mb-2 text-xs font-semibold px-2.5 py-1 rounded-full
              ${decoration.grupa === 'narukvica'
                ? 'bg-sky-100 text-sky-700'
                : 'bg-rose-100 text-rose-700'
              }`}>
              {decoration.grupa === 'narukvica' ? 'Narukvica' : 'Rever'}
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug">
              {decoration.naziv}
            </h2>
          </div>

          {/* Description (optional field) */}
          {decoration.opis && (
            <p className="text-sm text-gray-600 leading-relaxed -mt-2">{decoration.opis}</p>
          )}

          {/* Unit prices */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-center border border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Muška cena</p>
              <p className="text-lg font-bold text-rose-600">{cenaMuska.toLocaleString('sr-RS')} <span className="text-sm font-medium">RSD</span></p>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-center border border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Ženska cena</p>
              <p className="text-lg font-bold text-rose-600">{cenaZenska.toLocaleString('sr-RS')} <span className="text-sm font-medium">RSD</span></p>
            </div>
          </div>

          {/* Calculator */}
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex flex-col gap-4">
            <p className="text-[11px] font-semibold text-rose-400 uppercase tracking-wide">
              Izračunajte ukupnu cenu
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-700">Muških komada</label>
                <Stepper value={qMuska} onChange={setQMuska} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-gray-700">Ženskih komada</label>
                <Stepper value={qZenska} onChange={setQZenska} />
              </div>
            </div>

            <div className="min-h-[2rem]">
              {!hasQty ? (
                <p className="text-xs text-gray-400 italic text-center py-1">
                  Unesite količinu za izračunavanje
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Muških: {qMuska} × {cenaMuska.toLocaleString('sr-RS')} RSD</span>
                    <span className="font-semibold">{subtotalMuska.toLocaleString('sr-RS')} RSD</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Ženskih: {qZenska} × {cenaZenska.toLocaleString('sr-RS')} RSD</span>
                    <span className="font-semibold">{subtotalZenska.toLocaleString('sr-RS')} RSD</span>
                  </div>
                  <div className="h-px bg-rose-200 my-0.5" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-800">Ukupno</span>
                    <span className="text-xl font-bold text-rose-600">{total.toLocaleString('sr-RS')} RSD</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CTA button */}
          <button
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-sm shadow-rose-200 transition-all duration-150"
            onClick={() => {
              const calcData = hasQty ? {
                kalkulatorMuskih:    qMuska,
                kalkulatorZenskih:   qZenska,
                kalkulatorCenaMuska: cenaMuska,
                kalkulatorCenaZenska: cenaZenska,
                kalkulatorUkupno:    total,
              } : null
              onInterest(decoration, calcData)
            }}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
              <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
            </svg>
            Pošalji upit
          </button>
        </div>
      </div>
    </div>
  )
}
