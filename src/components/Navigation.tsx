import { useNavigate, useLocation } from 'react-router-dom'
import { ShoppingCart, UtensilsCrossed, ClipboardList, LayoutGrid, ChefHat, Settings, QrCode, LogOut, TrendingUp, MapPin, BarChart3 } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useSidebar } from '../context/SidebarContext'
import CustomerHeader from './CustomerHeader'
import { RESTAURANT } from '../config/restaurant'
import { cn } from './ui'


const customerItems = [
  { path: '/menu',      label: 'Menu',   icon: UtensilsCrossed, also: [] as string[] },
  { path: '/cart',      label: 'Cart',   icon: ShoppingCart,    also: [] as string[] },
  { path: '/my-orders', label: 'Orders', icon: ClipboardList,   also: ['/order/'] },
]

// Customer screens that show the header and bottom bar. Check-in, the pickup
// board and error pages stand alone.
const CUSTOMER_SHELL = ['/menu', '/cart', '/my-orders', '/order/']

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
  const { expanded: sidebarExpanded } = useSidebar()
  const isStaffRoute = location.pathname.startsWith('/staff')
  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)


  // Hide nav on landing page and staff login
  if (location.pathname === '/' || location.pathname === '/staff/login') return null
  if (!isStaffRoute && !CUSTOMER_SHELL.some(p => location.pathname.startsWith(p))) return null

  const handleLogout = () => { staffLogout(); navigate('/') }

  // ── STAFF gets sidebar on desktop, bottom bar on mobile ──
  if (isStaff && isStaffRoute) {
    return (
      <>
        {/* Desktop Sidebar */}
        <aside
          className="hidden md:flex fixed top-0 left-0 bottom-0 z-50 flex-col transition-all duration-400"
          style={{ 
            width: sidebarExpanded ? '224px' : '80px',
            backgroundColor: '#171210'
          }}
        >
          {/* Logo */}
          <button
            onClick={() => navigate('/staff/dashboard')}
            className="flex items-center gap-2.5 px-5 py-5 group transition-all duration-300"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
            >
              <img src="/assets/bean.png" alt={RESTAURANT.name} className="w-15 h-15 object-contain" />
            </div>
            {sidebarExpanded && (
              <div className="min-w-0">
                <span className="font-bold text-text-base text-sm block leading-tight">
                  {RESTAURANT.shortName}
                </span>
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
                  className="w-full flex items-center gap-4 px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-200"
                  style={active
                    ? { backgroundColor: 'rgba(200,134,10,0.15)', color: '#C8860A', border: '1px solid rgba(200,134,10,0.25)' }
                    : { color: '#9B8B7A', border: '1px solid transparent' }
                  }
                  onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = '#171210' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent' }}
                  title={!sidebarExpanded ? label : ''}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarExpanded && <span>{label}</span>}
                </button>
              )
            })}
          </nav>

          {/* Footer — Staff profile card */}
          <div className="px-3 py-4">
            {/* Profile card - only show when expanded */}
            {sidebarExpanded && (
              <div
                className="rounded-xl p-3 mb-3"
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
              </div>
            )}

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
              style={{
                backgroundColor: 'transparent',
                color: '#9B8B7A',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#F87171'; e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.05)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#9B8B7A'; e.currentTarget.style.backgroundColor = 'transparent' }}
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

  // ── CUSTOMER nav: top header + bottom navigation bar ──
  return (
    <>
      <CustomerHeader />
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-3">
          {customerItems.map(({ path, label, icon: Icon, also }) => {
            const active = isActive(path) || also.some(p => location.pathname.startsWith(p))
            return (
              <button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-150',
                  active ? 'text-ink' : 'text-ink-muted hover:text-ink',
                )}
              >
                <span className={cn('relative flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-150', active && 'bg-surface-2')}>
                  <Icon className="h-5 w-5" aria-hidden />
                  {path === '/cart' && cartCount > 0 && (
                    <span className="absolute -top-1 right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-medium tabular-nums text-on-accent">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </span>
                {label}
                {path === '/cart' && cartCount > 0 && <span className="sr-only">, {cartCount} items</span>}
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
