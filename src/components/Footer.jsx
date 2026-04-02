import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          <div>
            <img src="/logo.png" alt="Cvetići" className="h-9 w-auto object-contain mb-3" />
            <p className="text-xs text-gray-400 leading-relaxed max-w-xs">
              Ručno rađene dekoracije za vaše venčanje. Kvalitet i lepota za nezaboravan dan.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-4">Navigacija</h4>
            <ul className="flex flex-col gap-2.5">
              <li><Link to="/" className="text-xs text-gray-500 hover:text-rose-600 transition-colors">Početna</Link></li>
              <li><Link to="/kontakt" className="text-xs text-gray-500 hover:text-rose-600 transition-colors">Kontakt</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-4">Kontakt</h4>
            <ul className="flex flex-col gap-2.5">
              <li>
                <a href="mailto:radivojevic.ni@gmail.com" className="text-xs text-gray-500 hover:text-rose-600 transition-colors">
                  radivojevic.ni@gmail.com
                </a>
              </li>
              <li>
                <a href="tel:+381693700575" className="text-xs text-gray-500 hover:text-rose-600 transition-colors">
                  +381 69 37 00 575
                </a>
              </li>
              <li>
                <a href="https://www.instagram.com/cvetici.nis/" target="_blank" rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-rose-600 transition-colors">
                  @cvetici.nis
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} Cvetići. Sva prava zadržana.</p>
        </div>
      </div>
    </footer>
  )
}
