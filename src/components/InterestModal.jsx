import { useState } from 'react'
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export default function InterestModal({ decoration, kalkulatorData, onClose }) {
  const [form, setForm] = useState({ ime: '', telefon: '', email: '', komentar: '', saglasnost: false })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function validate() {
    const e = {}
    if (!form.ime.trim()) e.ime = 'Ime je obavezno'
    if (!form.telefon.trim()) e.telefon = 'Telefon je obavezan'
    if (!form.email.trim()) e.email = 'Email je obavezan'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email nije ispravan'
    if (!form.saglasnost) e.saglasnost = 'Morate dati saglasnost'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    try {
      const entry = {
        ime: form.ime.trim(),
        telefon: form.telefon.trim(),
        email: form.email.trim(),
        dekoracijaId: decoration.id,
        dekoracijaNaziv: decoration.naziv,
        kreirano: serverTimestamp(),
        procitano: false,
      }
      if (form.komentar.trim()) entry.komentar = form.komentar.trim()
      if (kalkulatorData) Object.assign(entry, kalkulatorData)
      await addDoc(collection(db, 'prijave'), entry)

      // Auto-create lead
      await addDoc(collection(db, 'lidovi'), {
        ime: form.ime.trim(),
        telefon: form.telefon.trim(),
        email: form.email.trim(),
        komentar: form.komentar.trim(),
        stavke: [{
          id: crypto.randomUUID(),
          naziv: decoration.naziv,
          dekoracijaId: decoration.id,
          slikaUrl: decoration.slikaUrl || '',
          grupa: decoration.grupa || 'rever',
          cenaMuska: decoration.cenaMuska ?? 0,
          cenaZenska: decoration.cenaZenska ?? 0,
          kolicinaMuskih: kalkulatorData?.kalkulatorMuskih ?? 0,
          kolicinaZenskih: kalkulatorData?.kalkulatorZenskih ?? 0,
        }],
        status: 'novi',
        kreirano: serverTimestamp(),
        azurirano: serverTimestamp(),
        beleska: '',
      })

      setSuccess(true)
      setTimeout(() => onClose(), 3000)
    } catch {
      setErrors({ submit: 'Greška pri slanju. Pokušajte ponovo.' })
      setLoading(false)
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    setErrors(er => ({ ...er, [name]: undefined }))
  }

  const inputCls = (err) =>
    `w-full px-3.5 py-2.5 text-sm text-gray-900 bg-white border rounded-lg outline-none transition-all
     ${err ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100'}`

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative max-h-[90vh] overflow-y-auto">
        <div className="p-6 sm:p-8">
          <button
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all text-xl leading-none"
            onClick={onClose}
            aria-label="Zatvori"
          >
            ×
          </button>

          {success ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  className="w-8 h-8 text-green-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">Hvala!</p>
                <p className="text-sm text-gray-500 mt-1">Kontaktiraćemo vas uskoro.</p>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-6 pr-8 leading-snug">
                Zainteresovan/a sam za:{' '}
                <span className="text-rose-600">{decoration.naziv}</span>
              </h2>

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                {/* Ime */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Ime i prezime</label>
                  <input id="ime" name="ime" type="text" placeholder="Vaše ime i prezime"
                    value={form.ime} onChange={handleChange} className={inputCls(errors.ime)} />
                  {errors.ime && <p className="text-xs text-red-500">{errors.ime}</p>}
                </div>

                {/* Telefon */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Telefon</label>
                  <input id="telefon" name="telefon" type="tel" placeholder="Vaš broj telefona"
                    value={form.telefon} onChange={handleChange} className={inputCls(errors.telefon)} />
                  {errors.telefon && <p className="text-xs text-red-500">{errors.telefon}</p>}
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <input id="email" name="email" type="email" placeholder="Vaša email adresa"
                    value={form.email} onChange={handleChange} className={inputCls(errors.email)} />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>

                {/* Komentar */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Imate pitanje? Slobodno nas pitajte!
                  </label>
                  <textarea id="komentar" name="komentar" rows={3}
                    placeholder="Npr. Da li je moguće u drugoj boji?"
                    value={form.komentar} onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none resize-y focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                  />
                </div>

                {/* Calculator summary */}
                {kalkulatorData && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex flex-col gap-2">
                    <p className="text-[11px] font-semibold text-rose-400 uppercase tracking-wide">
                      Vaša kalkulacija
                    </p>
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Muških: {kalkulatorData.kalkulatorMuskih} × {kalkulatorData.kalkulatorCenaMuska.toLocaleString('sr-RS')} RSD</span>
                      <span className="font-medium">{(kalkulatorData.kalkulatorMuskih * kalkulatorData.kalkulatorCenaMuska).toLocaleString('sr-RS')} RSD</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Ženskih: {kalkulatorData.kalkulatorZenskih} × {kalkulatorData.kalkulatorCenaZenska.toLocaleString('sr-RS')} RSD</span>
                      <span className="font-medium">{(kalkulatorData.kalkulatorZenskih * kalkulatorData.kalkulatorCenaZenska).toLocaleString('sr-RS')} RSD</span>
                    </div>
                    <div className="h-px bg-rose-200" />
                    <div className="flex justify-between text-sm font-bold text-rose-600">
                      <span>Ukupno</span>
                      <span>{kalkulatorData.kalkulatorUkupno.toLocaleString('sr-RS')} RSD</span>
                    </div>
                  </div>
                )}

                {/* Saglasnost */}
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" name="saglasnost" checked={form.saglasnost}
                      onChange={handleChange}
                      className="mt-0.5 w-4 h-4 accent-rose-600 shrink-0"
                    />
                    <span className="text-sm text-gray-600">
                      Saglasan/na sam da me kontaktirate u vezi ove dekoracije
                    </span>
                  </label>
                  {errors.saglasnost && <p className="text-xs text-red-500">{errors.saglasnost}</p>}
                </div>

                {errors.submit && <p className="text-xs text-red-500">{errors.submit}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors duration-150 mt-1"
                >
                  {loading ? 'Slanje...' : 'Pošaljite upit'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
