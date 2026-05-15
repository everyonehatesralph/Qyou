import { useNavigate, useLocation } from 'react-router-dom'
import {
  Search, ShoppingCart, ShoppingBag, ClipboardList, LayoutGrid,
  ChefHat, Settings, QrCode, LogOut, TrendingUp, MapPin, BarChart3,
  ChevronsUpDown, ChevronRight, PanelLeft
} from 'lucide-react'
import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'

const customerItems = [
  { path: '/search',      label: 'Search',    icon: Search },
  { path: '/menu',        label: 'Menu',      icon: ShoppingBag },
  { path: '/cart',        label: 'Cart',      icon: ShoppingCart },
  { path: '/my-orders',   label: 'Orders',    icon: ClipboardList },
]

const staffNavMain = [
  { path: '/staff/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { path: '/staff/kitchen',   label: 'Kitchen',   icon: ChefHat },
  { path: '/staff/tables',    label: 'Tables',    icon: MapPin },
]

const staffNavTools = [
  { path: '/staff/menu',      label: 'Menu Mgmt', icon: Settings },
  { path: '/staff/sales',     label: 'Analytics',  icon: TrendingUp },
  { path: '/staff/metrics',   label: 'Metrics',    icon: BarChart3 },
  { path: '/staff/qr-codes',  label: 'QR Codes',   icon: QrCode },
]

export default function Navigation() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { cartCount } = useCart()
  const { isStaff, staffLogout } = useAuth()
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const isStaffRoute = location.pathname.startsWith('/staff')
  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  // Hide nav on landing page and staff login
  if (location.pathname === '/' || location.pathname === '/staff/login') return null

  const handleLogout = () => { staffLogout(); navigate('/') }

  // ── STAFF: Square UI sidebar ──────────────────────────────────────────────
  if (isStaff && isStaffRoute) {
    return (
      <>
        {/* Desktop Sidebar */}
        <aside
          className="hidden md:flex fixed top-0 left-0 bottom-0 z-50 flex-col transition-all duration-300"
          style={{
            width: sidebarExpanded ? '224px' : '64px',
            backgroundColor: '#171210',
            borderRight: '1px solid #2E2318',
          }}
        >
          {/* ─ Brand Header (Square UI pattern) ─ */}
          <div
            className="flex items-center gap-2.5 px-3 py-3 shrink-0"
            style={{ borderBottom: '1px solid #2E2318' }}
          >
            <button
              onClick={() => navigate('/staff/dashboard')}
              className="flex items-center gap-2.5 w-full hover:opacity-80 transition-opacity rounded-md p-1 -m-1"
            >
              <div
                className="flex w-7 h-7 items-center justify-center rounded-lg shrink-0 overflow-hidden"
                style={{ backgroundColor: '#F0E6D3' }}
              >
                <img src="/assets/bean.png" alt="DeVerse Cafe" className="w-4 h-4 object-contain" />
              </div>
              {sidebarExpanded && (
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium" style={{ color: '#F0E6D3' }}>
                    DeVerse Cafe
                  </span>
                  <ChevronsUpDown className="w-3 h-3" style={{ color: '#5C4F44' }} />
                </div>
              )}
            </button>
          </div>

          {/* ─ Main Navigation ─ */}
          <nav className="flex-1 px-2.5 py-3 overflow-y-auto space-y-4">
            {/* Primary nav */}
            <div className="space-y-0.5">
              {staffNavMain.map(({ path, label, icon: Icon }) => {
                const active = isActive(path)
                return (
                  <button
                    key={path}
                    onClick={() => navigate(path)}
                    className="w-full flex items-center gap-2.5 h-7 px-2 rounded-md text-sm transition-all duration-150"
                    style={active
                      ? { backgroundColor: 'rgba(200,134,10,0.12)', color: '#C8860A' }
                      : { color: '#9B8B7A' }
                    }
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#F0E6D3' } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9B8B7A' } }}
                    title={!sidebarExpanded ? label : ''}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {sidebarExpanded && <span className="text-sm">{label}</span>}
                    {active && sidebarExpanded && (
                      <span
                        className="ml-auto flex w-5 h-5 items-center justify-center rounded text-[10px] font-medium"
                        style={{ backgroundColor: 'rgba(200,134,10,0.15)', color: '#C8860A' }}
                      >
                        ●
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Tools section label */}
            <div>
              {sidebarExpanded && (
                <div className="flex items-center justify-between px-2 h-6 mb-1">
                  <span
                    className="text-[10px] font-medium tracking-wider uppercase"
                    style={{ color: '#5C4F44' }}
                  >
                    Tools
                  </span>
                </div>
              )}
              <div className="space-y-0.5">
                {staffNavTools.map(({ path, label, icon: Icon }) => {
                  const active = isActive(path)
                  return (
                    <button
                      key={path}
                      onClick={() => navigate(path)}
                      className="w-full flex items-center gap-2.5 h-7 px-2 rounded-md text-sm transition-all duration-150"
                      style={active
                        ? { backgroundColor: 'rgba(200,134,10,0.12)', color: '#C8860A' }
                        : { color: '#9B8B7A' }
                      }
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#F0E6D3' } }}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9B8B7A' } }}
                      title={!sidebarExpanded ? label : ''}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {sidebarExpanded && <span className="text-sm">{label}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </nav>

          {/* ─ Footer (Square UI pattern) ─ */}
          <div className="px-2.5 pb-3 shrink-0" style={{ borderTop: '1px solid #2E2318' }}>
            {/* Collapse toggle */}
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="w-full flex items-center gap-2 h-7 px-2 rounded-md text-sm transition-all duration-150 mt-3 mb-2"
              style={{ color: '#5C4F44' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#9B8B7A' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#5C4F44' }}
            >
              {sidebarExpanded
                ? <><PanelLeft className="w-3.5 h-3.5 shrink-0" /><span>Collapse</span></>
                : <ChevronRight className="w-3.5 h-3.5 shrink-0 mx-auto" />
              }
            </button>

            {/* Profile card (Square UI footer promo pattern) */}
            {sidebarExpanded && (
              <div
                className="relative flex flex-col gap-2 rounded-lg p-3 text-sm w-full"
                style={{ backgroundColor: '#0D0B0A', border: '1px solid #2E2318' }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, #C8860A, #E8C97A)', color: '#0D0B0A' }}
                  >
                    S
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-tight" style={{ color: '#F0E6D3' }}>Staff Account</p>
                    <p className="text-[10px]" style={{ color: '#5C4F44' }}>Administrator</p>
                  </div>
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: '#4ADE80', boxShadow: '0 0 6px rgba(74,222,128,0.4)' }}
                  />
                </div>

                {/* Theme row */}
                <div
                  className="flex items-center justify-between px-2 py-1.5 rounded-md"
                  style={{ backgroundColor: '#171210' }}
                >
                  <span className="text-[10px] font-medium" style={{ color: '#5C4F44' }}>Theme</span>
                  <ThemeToggle variant="nav" />
                </div>

                {/* Sign out */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-1.5 h-7 rounded-md text-xs font-medium transition-all duration-150 active:scale-95"
                  style={{ color: '#5C4F44' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#5C4F44'; e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <LogOut className="w-3 h-3" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile Bottom Bar (staff) */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-50"
          style={{ backgroundColor: '#171210', borderTop: '1px solid #2E2318' }}
        >
          <div className="grid grid-cols-7">
            {[...staffNavMain, ...staffNavTools].map(({ path, label, icon: Icon }) => {
              const active = isActive(path)
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="relative flex flex-col items-center justify-center py-2.5 px-1 transition-all duration-150"
                  style={{ color: active ? '#C8860A' : '#5C4F44' }}
                >
                  {active && (
                    <span
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
                      style={{ backgroundColor: '#C8860A' }}
                    />
                  )}
                  <Icon className="w-4 h-4" />
                  <span className="text-[8px] mt-0.5 font-medium leading-tight">{label}</span>
                </button>
              )
            })}
          </div>
          <div
            className="flex items-center justify-between px-4 py-1"
            style={{ borderTop: '1px solid #2E2318', backgroundColor: '#0D0B0A' }}
          >
            <span className="text-[10px]" style={{ color: '#3D3028' }}>Staff Mode</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-[10px]"
              style={{ color: '#F87171' }}
            >
              <LogOut className="w-3 h-3" /> Logout
            </button>
          </div>
        </nav>

        {/* Spacer */}
        <div
          className="hidden md:block flex-shrink-0 transition-all duration-300"
          style={{ width: sidebarExpanded ? '224px' : '64px' }}
        />
      </>
    )
  }

  // ── CUSTOMER nav: top bar (desktop) + bottom bar (mobile) ──
  return (
    <>
      {/* Desktop top bar */}
      <nav
        className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-14 items-center glass"
        style={{ borderBottom: '1px solid #2E2318' }}
      >
        <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 group"
          >
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: 'rgba(200,134,10,0.15)', border: '1px solid rgba(200,134,10,0.35)' }}
            >
              <img src="/assets/bean.png" alt="DeVerse Cafe" className="w-5 h-5 object-contain" />
            </div>
            <span className="font-bold text-text-base group-hover:text-accent transition-colors text-sm">
              DeVerse <span className="text-primary">Cafe</span>
            </span>
          </button>
          <div className="flex items-center gap-1">
            {customerItems.map(({ path, label, icon: Icon }) => {
              const active = isActive(path)
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active ? 'text-background' : 'text-text-muted hover:text-text-base'
                  }`}
                  style={active
                    ? { backgroundColor: '#C8860A', boxShadow: '0 0 12px rgba(200,134,10,0.3)' }
                    : undefined
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                  {path === '/cart' && cartCount > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold"
                      style={{ backgroundColor: '#F87171' }}
                    >
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </button>
              )
            })}
            <ThemeToggle variant="nav" />
            <button
              onClick={() => navigate('/staff/login')}
              className="ml-3 pl-3 text-xs text-text-faint hover:text-text-muted transition-colors"
              style={{ borderLeft: '1px solid var(--border)' }}
            >
              Staff →
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile bottom bar (customer) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass"
        style={{ borderTop: '1px solid #2E2318' }}
      >
        <div className="grid grid-cols-4">
          {customerItems.map(({ path, label, icon: Icon }) => {
            const active = isActive(path)
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="relative flex flex-col items-center justify-center py-3 px-2 transition-all duration-200"
                style={{ color: active ? '#C8860A' : '#9B8B7A' }}
              >
                {active && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                    style={{ backgroundColor: '#C8860A' }}
                  />
                )}
                <Icon className="w-5 h-5" />
                <span className="text-[11px] mt-1 font-medium">{label}</span>
                {path === '/cart' && cartCount > 0 && (
                  <span
                    className="absolute top-2 right-1/4 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold"
                    style={{ backgroundColor: '#F87171' }}
                  >
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}