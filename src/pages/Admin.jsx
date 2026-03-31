import { useState, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { auth } from '../firebase'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import AdminDekoracije from '../components/AdminDekoracije'
import AdminPrijave from '../components/AdminPrijave'
import AdminLidovi from '../components/AdminLidovi'
import AdminLeadDetail from '../components/AdminLeadDetail'
import AdminKategorije from '../components/AdminKategorije'
import DekoracijaForm from './DekoracijaForm'

// ── Icons ──────────────────────────────────────────────────────────────────
function SparklesIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  )
}
function InboxIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
    </svg>
  )
}
function LogoutIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>
  )
}
function BarsIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  )
}
function XIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}
function UsersIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  )
}
function FolderIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  )
}
function ArrowLeftIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  )
}

// ── Nav config ──────────────────────────────────────────────────────────────
const NAV = [
  { key: 'dekoracije', label: 'Dekoracije', Icon: SparklesIcon },
  { key: 'kategorije', label: 'Kategorije', Icon: FolderIcon   },
  { key: 'prijave',    label: 'Prijave',    Icon: InboxIcon    },
  { key: 'lidovi',     label: 'Lidovi',     Icon: UsersIcon    },
]

// ── Sidebar ─────────────────────────────────────────────────────────────────
function SidebarContent({ user, activeTab, location, onNav, onLogout }) {
  const onFormRoute = location.pathname.includes('/dekoracije/')

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center shrink-0">
            <SparklesIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">Dekoracije</p>
            <p className="text-[11px] text-gray-400 leading-tight">Admin panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map(({ key, label, Icon }) => {
          const isActive = key === 'dekoracije'
            ? (activeTab === key || onFormRoute)
            : activeTab === key
          return (
            <button
              key={key}
              onClick={() => onNav(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left
                ${isActive
                  ? 'bg-rose-50 text-rose-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 truncate mb-3">{user.email}</p>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
        >
          <LogoutIcon className="w-4 h-4 shrink-0" />
          Odjavi se
        </button>
      </div>
    </div>
  )
}

// ── Tab content ─────────────────────────────────────────────────────────────
function AdminTabContent({ activeTab, selectedLead, onSelect, onBack, lidoviKey, dekoracijeKey }) {
  return (
    <>
      <div className={activeTab === 'dekoracije' ? '' : 'hidden'}>
        <AdminDekoracije key={dekoracijeKey} />
      </div>
      <div className={activeTab === 'kategorije' ? '' : 'hidden'}>
        <AdminKategorije />
      </div>
      <div className={activeTab === 'prijave' ? '' : 'hidden'}>
        <AdminPrijave />
      </div>
      <div className={activeTab === 'lidovi' ? '' : 'hidden'}>
        {selectedLead ? (
          <AdminLeadDetail key={selectedLead.id} lead={selectedLead} onBack={onBack} />
        ) : (
          <AdminLidovi key={lidoviKey} onSelect={onSelect} />
        )}
      </div>
    </>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function Admin() {
  const navigate = useNavigate()
  const location = useLocation()

  const [user, setUser] = useState(undefined)
  const [activeTab, setActiveTab] = useState('dekoracije')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState(null)
  const [lidoviKey, setLidoviKey] = useState(0)
  const [dekoracijeKey, setDekoracijeKey] = useState(0)

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError]     = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u || null))
    return unsub
  }, [])

  useEffect(() => {
    function onResize() { if (window.innerWidth >= 1024) setSidebarOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // When navigating back from a form route to the index, refresh the dekoracije list
  const prevPathRef = useRef(location.pathname)
  useEffect(() => {
    const prev = prevPathRef.current
    const curr = location.pathname
    const wasForm = prev.includes('/dekoracije/')
    const nowRoot = curr === '/admin' || curr === '/admin/'
    if (wasForm && nowRoot) setDekoracijeKey(k => k + 1)
    prevPathRef.current = curr
  }, [location.pathname])

  async function handleLogin(e) {
    e.preventDefault()
    setLoginError(''); setLoginLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch {
      setLoginError('Pogrešan email ili lozinka.')
    } finally {
      setLoginLoading(false)
    }
  }

  function handleNav(key) {
    setActiveTab(key)
    setSelectedLead(null)
    setSidebarOpen(false)
    navigate('/admin')
  }

  function handleSelectLead(lead) { setSelectedLead(lead) }
  function handleBackFromLead() {
    setSelectedLead(null)
    setLidoviKey(k => k + 1)
  }

  // Determine header title from current route
  const onFormRoute = location.pathname.includes('/dekoracije/')
  const isNewForm   = location.pathname.endsWith('/dekoracije/nova')
  const headerTitle = isNewForm
    ? 'Nova dekoracija'
    : onFormRoute
    ? 'Izmeni dekoraciju'
    : activeTab === 'lidovi' && selectedLead
    ? selectedLead.ime
    : NAV.find(n => n.key === activeTab)?.label ?? ''

  const inputCls = "w-full px-3.5 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"

  // ── Loading ──
  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-[3px] border-rose-100 border-t-rose-500 rounded-full animate-spin" />
      </div>
    )
  }

  // ── Login ──
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-7 sm:p-9 w-full max-w-sm">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center shrink-0">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">Admin pristup</h1>
              <p className="text-xs text-gray-400 leading-tight">Prijavite se da upravljate sadržajem</p>
            </div>
          </div>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@email.com" required className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Lozinka</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required className={inputCls} />
            </div>
            {loginError && <p className="text-xs text-red-500">{loginError}</p>}
            <button type="submit" disabled={loginLoading}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors mt-1">
              {loginLoading ? 'Prijavljivanje...' : 'Prijavi se'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Admin layout ──
  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-30">
        <SidebarContent
          user={user}
          activeTab={activeTab}
          location={location}
          onNav={handleNav}
          onLogout={() => signOut(auth)}
        />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-64 bg-white shadow-xl flex flex-col h-full">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3.5 right-3.5 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
              aria-label="Zatvori meni"
            >
              <XIcon className="w-5 h-5" />
            </button>
            <SidebarContent
              user={user}
              activeTab={activeTab}
              location={location}
              onNav={handleNav}
              onLogout={() => signOut(auth)}
            />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">

        {/* Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 sm:px-6 py-3.5 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 -ml-1 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
            aria-label="Otvori meni"
          >
            <BarsIcon className="w-5 h-5" />
          </button>

          {/* Back button when on form routes */}
          {onFormRoute && (
            <button
              onClick={() => { setActiveTab('dekoracije'); navigate('/admin') }}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors -ml-1 mr-1"
              aria-label="Nazad"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-medium">Nazad</span>
            </button>
          )}

          <h2 className="text-base font-semibold text-gray-900">{headerTitle}</h2>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 pb-16 max-w-5xl w-full mx-auto">
          <Routes>
            <Route index element={
              <AdminTabContent
                activeTab={activeTab}
                selectedLead={selectedLead}
                onSelect={handleSelectLead}
                onBack={handleBackFromLead}
                lidoviKey={lidoviKey}
                dekoracijeKey={dekoracijeKey}
              />
            } />
            <Route path="dekoracije/nova" element={<DekoracijaForm />} />
            <Route path="dekoracije/:id"  element={<DekoracijaForm />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
