import { useState, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { auth, db } from '../firebase'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore'
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
function ArchIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
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
function BellIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
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
        <img src="/logo.png" alt="Cvetići" className="h-9 w-auto object-contain" />
        <p className="text-[11px] text-gray-400 mt-1">Admin panel</p>
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
function AdminTabContent({ activeTab, selectedLead, onSelect, onBack, onConvertToLead, lidoviKey, dekoracijeKey }) {
  return (
    <>
      <div className={activeTab === 'dekoracije' ? '' : 'hidden'}>
        <AdminDekoracije key={dekoracijeKey} />
      </div>
      <div className={activeTab === 'kategorije' ? '' : 'hidden'}>
        <AdminKategorije />
      </div>
      <div className={activeTab === 'prijave' ? '' : 'hidden'}>
        <AdminPrijave onConvertToLead={onConvertToLead} />
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
  const [toast, setToast] = useState('')

  const [notifOpen, setNotifOpen]         = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notifLoading, setNotifLoading]   = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u || null)
      if (u) fetchNotifications()
    })
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

  // Show toast after successful save
  useEffect(() => {
    if (!location.state?.saved) return
    setToast('Dekoracija je uspešno sačuvana.')
    navigate(location.pathname, { replace: true, state: {} })
    const t = setTimeout(() => setToast(''), 3000)
    return () => clearTimeout(t)
  }, [location.state?.saved])

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
  function handleConvertToLead(lead) {
    setActiveTab('lidovi')
    setSelectedLead(lead)
    setLidoviKey(k => k + 1)
    setSidebarOpen(false)
  }

  async function fetchNotifications() {
    setNotifLoading(true)
    try {
      const [prijaveSnap, kontaktiSnap] = await Promise.all([
        getDocs(query(collection(db, 'prijave'),  where('procitano', '==', false))),
        getDocs(query(collection(db, 'kontakti'), where('procitano', '==', false))),
      ])
      const prijave  = prijaveSnap.docs.map(d => ({ id: d.id, _col: 'prijave',  ...d.data() }))
      const kontakti = kontaktiSnap.docs.map(d => ({ id: d.id, _col: 'kontakti', ...d.data() }))
      const all = [...prijave, ...kontakti].sort((a, b) => {
        const ta = a.kreirano?.seconds ?? 0
        const tb = b.kreirano?.seconds ?? 0
        return tb - ta
      })
      setNotifications(all)
    } finally {
      setNotifLoading(false)
    }
  }

  async function markNotifRead(n) {
    await updateDoc(doc(db, n._col, n.id), { procitano: true })
    setNotifications(prev => prev.filter(x => x.id !== n.id))
  }

  async function markAllRead() {
    await Promise.all(notifications.map(n => updateDoc(doc(db, n._col, n.id), { procitano: true })))
    setNotifications([])
  }

  function getNotifSource(n) {
    if (n._col === 'kontakti')          return { label: 'Kontakt',          cls: 'bg-sky-100 text-sky-700' }
    if (n.izvor === 'pocetna')          return { label: 'Početna stranica',  cls: 'bg-rose-100 text-rose-700' }
    if (n.dekoracijaNaziv)              return { label: 'Proizvodi',          cls: 'bg-purple-100 text-purple-700' }
    return                                     { label: 'Upit',              cls: 'bg-gray-100 text-gray-600' }
  }

  function openNotifPanel() {
    setNotifOpen(true)
    fetchNotifications()
  }

  function formatNotifDate(ts) {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
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
          <div className="flex flex-col gap-3 mb-6">
            <img src="/logo.png" alt="Cvetići" className="h-10 w-auto object-contain" />
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Notification panel */}
      {notifOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setNotifOpen(false)}
          />
          <aside className="fixed right-0 top-0 h-full w-80 sm:w-96 bg-white z-50 shadow-2xl flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <BellIcon className="w-5 h-5 text-gray-600" />
                <h3 className="text-sm font-bold text-gray-900">Obaveštenja</h3>
                {notifications.length > 0 && (
                  <span className="text-xs font-semibold bg-red-500 text-white px-2 py-0.5 rounded-full">
                    {notifications.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => setNotifOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto">
              {notifLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-7 h-7 border-[3px] border-rose-100 border-t-rose-500 rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <BellIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">Nema novih obaveštenja</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map(n => {
                    const src = getNotifSource(n)
                    return (
                      <div
                        key={n._col + n.id}
                        className="px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          markNotifRead(n)
                          if (n._col === 'prijave') setActiveTab('prijave')
                          setNotifOpen(false)
                          setSidebarOpen(false)
                        }}
                      >
                        {/* Source badge + date */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${src.cls}`}>
                            {src.label}
                          </span>
                          <span className="text-[11px] text-gray-400 shrink-0">{formatNotifDate(n.kreirano)}</span>
                        </div>

                        {/* Name */}
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          <span className="text-sm font-semibold text-gray-900">{n.ime}</span>
                        </div>

                        {/* Decoration (Proizvodi only) */}
                        {n.dekoracijaNaziv && (
                          <p className="text-xs text-gray-500 ml-3 mb-0.5">
                            <span className="font-medium">Dekoracija:</span> {n.dekoracijaNaziv}
                          </p>
                        )}

                        {/* Message snippet */}
                        {(n.poruka || n.komentar) && (
                          <p className="text-xs text-gray-400 ml-3 line-clamp-2 italic leading-relaxed">
                            "{n.poruka || n.komentar}"
                          </p>
                        )}

                        {/* Contact */}
                        <p className="text-xs text-gray-400 ml-3 mt-1">{n.telefon}{n.email ? ` · ${n.email}` : ''}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Panel footer */}
            {notifications.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100">
                <button
                  onClick={markAllRead}
                  className="w-full text-xs font-medium text-gray-500 hover:text-rose-600 py-2 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  Označi sve kao pročitano
                </button>
              </div>
            )}
          </aside>
        </>
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

          {/* Notification bell */}
          <div className="ml-auto">
            <button
              onClick={openNotifPanel}
              className="relative p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
              aria-label="Obaveštenja"
            >
              <BellIcon className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>
          </div>
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
                onConvertToLead={handleConvertToLead}
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
