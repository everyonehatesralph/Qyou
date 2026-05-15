import { useNavigate, useLocation } from 'react-router-dom'
import { Search, ShoppingCart, ShoppingBag, ClipboardList, LayoutGrid, ChefHat, Settings, QrCode, LogOut, TrendingUp, MapPin, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'
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

const staffItems = [
  { path: '/staff/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { path: '/staff/kitchen',   label: 'Kitchen',   icon: ChefHat },
  { path: '/staff/menu',      label: 'Menu Mgmt', icon: Settings },
  { path: '/staff/tables',    label: 'Tables',     icon: MapPin },
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

  // ── STAFF gets sidebar on desktop, bottom bar on mobile ──
  if (isStaff && isStaffRoute) {
    return (
      <>
        {/* Desktop Sidebar */}
        <aside
          className="hidden md:flex fixed top-0 left-0 bottom-0 z-50 flex-col transition-all duration-300"
          style={{ 
            width: sidebarExpanded ? '224px' : '80px',
            backgroundColor: '#0D0B0A', 
            borderRight: '1px solid #2E2318' 
          }}
        >
          {/* Logo */}
          <button
            onClick={() => navigate('/staff/dashboard')}
            className="flex items-center gap-2.5 px-5 py-5 group transition-all duration-300"
            style={{ borderBottom: '1px solid #2E2318' }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ backgroundColor: 'rgba(200,134,10,0.15)', border: '1px solid rgba(200,134,10,0.35)' }}
            >
              <img src="/assets/bean.png" alt="DeVerse Cafe" className="w-5 h-5 object-contain" />
            </div>
            {sidebarExpanded && (
              <div className="min-w-0">
                <span className="font-bold text-text-base text-sm block leading-tight">
                  DeVerse <span className="text-primary">Cafe</span>
                </span>
                <span className="text-[10px] text-text-faint">Staff Panel</span>
              </div>
            )}
          </button>

          {/* Nav items */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {staffItems.map(({ path, label, icon: Icon }) => {
              const active = isActive(path)
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
                  style={active
                    ? { backgroundColor: 'rgba(200,134,10,0.15)', color: '#C8860A', border: '1px solid rgba(200,134,10,0.25)' }
                    : { color: '#9B8B7A', border: '1px solid transparent' }
                  }
                  onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = '#171210' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent' }}
                  title={!sidebarExpanded ? label : ''}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {sidebarExpanded && <span>{label}</span>}
                  {active && (
                    <span
                      className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: '#C8860A' }}
                    />
                  )}
                </button>
              )
            })}
          </nav>

          {/* Footer — Staff profile card */}
          <div className="px-3 py-4" style={{ borderTop: '1px solid #2E2318' }}>
            {/* Collapse button */}
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all mb-3"
              style={{
                backgroundColor: 'rgba(200,134,10,0.08)',
                color: '#C8860A',
                border: '1px solid rgba(200,134,10,0.2)',
              }}
              title={sidebarExpanded ? 'Collapse' : 'Expand'}
            >
              {sidebarExpanded ? (
                <>
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Collapse</span>
                </>
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Profile card - only show when expanded */}
            {sidebarExpanded && (
              <div
                className="rounded-xl p-3 mb-3"
                style={{ backgroundColor: '#171210', border: '1px solid #2E2318' }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #C8860A 0%, #E8C97A 100%)',
                      color: '#0D0B0A',
                    }}
                  >
                    S
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-base leading-tight">Staff Account</p>
                    <p className="text-[10px] text-text-faint mt-0.5">Administrator</p>
                  </div>
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: '#4ADE80', boxShadow: '0 0 6px rgba(74,222,128,0.5)' }}
                    title="Online"
                  />
                </div>

                {/* Theme row */}
                <div
                  className="flex items-center justify-between px-2 py-2 rounded-lg"
                  style={{ backgroundColor: '#0D0B0A' }}
                >
                  <span className="text-[11px] text-text-muted font-medium">Appearance</span>
                  <ThemeToggle variant="nav" />
                </div>
              </div>
            )}

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
              style={{
                backgroundColor: 'transparent',
                color: '#9B8B7A',
                border: '1px solid #2E2318',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(248,113,113,0.4)'; e.currentTarget.style.color = '#F87171'; e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.05)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#2E2318'; e.currentTarget.style.color = '#9B8B7A'; e.currentTarget.style.backgroundColor = 'transparent' }}
              title={!sidebarExpanded ? 'Sign Out' : ''}
            >
              <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
              {sidebarExpanded && 'Sign Out'}
            </button>
          </div>
        </aside>

        {/* Mobile Bottom Bar (staff) */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass"
          style={{ borderTop: '1px solid #2E2318' }}
        >
          <div className="grid grid-cols-6">
            {staffItems.map(({ path, label, icon: Icon }) => {
              const active = isActive(path)
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="relative flex flex-col items-center justify-center py-2.5 px-1 transition-all duration-200"
                  style={{ color: active ? '#C8860A' : '#9B8B7A' }}
                >
                  {active && (
                    <span
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                      style={{ backgroundColor: '#C8860A' }}
                    />
                  )}
                  <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                  <span className="text-[9px] mt-0.5 font-medium leading-tight">{label}</span>
                </button>
              )
            })}
          </div>
          <div
            className="flex items-center justify-between px-4 py-1.5"
            style={{ borderTop: '1px solid #2E2318', backgroundColor: '#0D0B0A' }}
          >
            <span className="text-[10px] text-text-faint">Staff Mode</span>
            <button onClick={handleLogout} className="flex items-center gap-1 text-[10px] text-error">
              <LogOut className="w-3 h-3" /> Logout
            </button>
          </div>
        </nav>

        {/* Spacer: push content right of sidebar on desktop, below top on mobile */}
        <div className="hidden md:block flex-shrink-0 transition-all duration-300" style={{ width: sidebarExpanded ? '224px' : '80px' }} />
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