import { useState } from 'react'
import { db } from '../firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import Footer from '../components/Footer'
import Header from '../components/Header'

const FAQ = [
  {
    q: 'Koji je rok za izradu?',
    a: 'Rok za izradu naših dekoracija je 7–14 radnih dana, u zavisnosti od složenosti i obima narudžbine. Za hitne narudžbine, molimo vas da nas kontaktirate direktno.',
  },
  {
    q: 'Da li šaljete pakete i van Srbije?',
    a: 'Trenutno vršimo dostavu isključivo unutar Srbije. Radimo na proširenju dostave i na region — pratite naša obaveštenja.',
  },
  {
    q: 'Da li se plaća carina?',
    a: 'Kako dostavljamo samo unutar Srbije, nema carinskih troškova. Cena dostave je transparentna i dogovorena unapred.',
  },
  {
    q: 'Kojom kurirskom službom šaljete?',
    a: 'Sarađujemo sa proverenim kurirskim službama (Post Express, City Express). Paketi stižu u roku 1–3 radna dana od slanja.',
  },
  {
    q: 'Koliko košta poštarina?',
    a: 'Cena dostave zavisi od težine paketa i mesta isporuke. Tačnu cenu ćemo vas obavestiti pri potvrdi narudžbine.',
  },
  {
    q: 'Da li može da se bira boja satenske trake?',
    a: 'Da! Nudimo širok izbor boja satenske trake. Vaš izbor boje navedite pri narudžbini ili nas kontaktirajte za dostupne opcije.',
  },
]

export default function Kontakt() {
  const [contactForm, setContactForm] = useState({ ime: '', telefon: '', email: '', poruka: '' })
  const [contactSending, setContactSending] = useState(false)
  const [contactSent, setContactSent] = useState(false)
  const [contactError, setContactError] = useState('')
  const [faqOpen, setFaqOpen] = useState(null)
  async function handleContactSubmit(e) {
    e.preventDefault()
    setContactSending(true)
    setContactError('')
    try {
      await addDoc(collection(db, 'kontakti'), { ...contactForm, procitano: false, kreirano: serverTimestamp() })
      setContactSent(true)
      setContactForm({ ime: '', telefon: '', email: '', poruka: '' })
    } catch {
      setContactError('Greška pri slanju. Pokušajte ponovo.')
    } finally {
      setContactSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      <Header />

      <main className="flex-1">

        {/* ── Contact Section ── */}
        <section className="bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="text-center mb-12">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Kontaktirajte nas</h1>
              <p className="text-gray-500 text-sm sm:text-base max-w-xl mx-auto">
                Imate pitanje ili želite da naručite? Tu smo za vas — pišite nam ili pozovite.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

              {/* Info */}
              <div className="flex flex-col gap-7">
                <h2 className="text-lg font-semibold text-gray-800">Kako da nas kontaktirate</h2>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-rose-500">
                      <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z"/>
                      <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Email</p>
                    <a href="mailto:radivojevic.ni@gmail.com" className="text-sm text-gray-800 hover:text-rose-600 transition-colors">
                      radivojevic.ni@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-rose-500">
                      <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 15.352V16.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Telefon</p>
                    <a href="tel:+381693700575" className="text-sm text-gray-800 hover:text-rose-600 transition-colors">
                      +381 69 37 00 575
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-rose-500">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069ZM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Instagram</p>
                    <a href="https://www.instagram.com/cvetici.nis/" target="_blank" rel="noopener noreferrer"
                      className="text-sm text-gray-800 hover:text-rose-600 transition-colors">
                      @cvetici.nis
                    </a>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-100">
                {contactSent ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-green-600">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-gray-900">Poruka je poslata!</p>
                      <p className="text-sm text-gray-500 mt-1">Javićemo vam se u najkraćem roku.</p>
                    </div>
                    <button onClick={() => setContactSent(false)}
                      className="text-xs text-rose-600 hover:text-rose-800 font-medium transition-colors">
                      Pošalji novu poruku
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="flex flex-col gap-4">
                    <h3 className="text-base font-semibold text-gray-800 mb-1">Pošaljite nam poruku</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-gray-600">Ime i prezime *</label>
                        <input required type="text" value={contactForm.ime} placeholder="Vaše ime"
                          onChange={e => setContactForm(f => ({ ...f, ime: e.target.value }))}
                          className="px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"/>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-gray-600">Telefon</label>
                        <input type="tel" value={contactForm.telefon} placeholder="+381 6x xxx xxxx"
                          onChange={e => setContactForm(f => ({ ...f, telefon: e.target.value }))}
                          className="px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"/>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-600">Email *</label>
                      <input required type="email" value={contactForm.email} placeholder="vas@email.com"
                        onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                        className="px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"/>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-600">Poruka *</label>
                      <textarea required value={contactForm.poruka} rows={4} placeholder="Vaša poruka..."
                        onChange={e => setContactForm(f => ({ ...f, poruka: e.target.value }))}
                        className="px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none resize-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"/>
                    </div>
                    {contactError && <p className="text-xs text-red-500">{contactError}</p>}
                    <button type="submit" disabled={contactSending}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors">
                      {contactSending ? 'Slanje...' : 'Pošalji poruku'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="bg-gray-50 border-t border-gray-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">
              Najčešće postavljena pitanja
            </h2>
            <div className="flex flex-col">
              {FAQ.map((item, i) => (
                <div key={i} className="border-t border-gray-200 last:border-b border-gray-200">
                  <button
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                    className="w-full flex items-center gap-4 py-5 text-left group"
                  >
                    <span className="text-rose-500 text-xl font-light w-5 shrink-0 leading-none">
                      {faqOpen === i ? '−' : '+'}
                    </span>
                    <span className="text-sm sm:text-base font-medium text-gray-800 group-hover:text-rose-600 transition-colors">
                      {item.q}
                    </span>
                  </button>
                  {faqOpen === i && (
                    <p className="pb-5 pl-9 text-sm text-gray-500 leading-relaxed">{item.a}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  )
}
