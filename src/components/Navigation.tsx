import { useNavigate, useLocation } from 'react-router-dom'
import { Search, ShoppingCart, ShoppingBag, ClipboardList, LayoutGrid, ChefHat, Settings, QrCode, LogOut, TrendingUp } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'
import { useMemo } from 'react'
const customerItems = [
  { path: '/search',      label: 'Search',    icon: Search },
  { path: '/menu',      label: 'Menu',    icon: ShoppingBag },
  { path: '/cart',      label: 'Cart',    icon: ShoppingCart },
  { path: '/my-orders', label: 'Orders',  icon: ClipboardList },
]
const staffItems = [
  { path: '/staff/dashboard', label: 'Dashboard', icon: LayoutGrid   },
  { path: '/staff/kitchen',   label: 'Kitchen',   icon: ChefHat      },
  { path: '/staff/menu',      label: 'Manage',    icon: Settings     },
  { path: '/staff/sales',     label: 'Sales',     icon: TrendingUp   },
  { path: '/staff/qr-codes',  label: 'QR',        icon: QrCode       },
]
export default function Navigation() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { cartCount } = useCart()
  const { isStaff, staffLogout } = useAuth()
  const isStaffRoute = location.pathname.startsWith('/staff')
  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const navItems = useMemo(
    () => (isStaff && isStaffRoute ? staffItems : customerItems),
    [isStaff, isStaffRoute]
  )
  // Hide nav on landing page and staff login — both are full-screen immersive
  if (location.pathname === '/' || location.pathname === '/staff/login') return null
  const mobileGridCols = 'grid-cols-4'
  const handleLogout = () => { staffLogout(); navigate('/') }
  return (
    <>
      {/* ── Desktop nav ─────────────────────────────────── */}
      <nav
        className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-14 items-center glass"
        style={{ borderBottom: '1px solid #2E2318' }}
      >
        <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => navigate(isStaff && isStaffRoute ? '/staff/dashboard' : '/')}
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
          {/* Nav items */}
          <div className="flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => {
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
            {/* Staff badge + logout */}
            {isStaff && (
              <div className="flex items-center gap-2 ml-3 pl-3" style={{ borderLeft: '1px solid #2E2318' }}>
                <span
                  className="badge text-xs"
                  style={{ backgroundColor: 'rgba(200,134,10,0.12)', color: '#C8860A', border: '1px solid rgba(200,134,10,0.3)' }}
                >
                  Staff
                </span>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error-bg transition-all"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
            {/* Theme toggle */}
            <ThemeToggle variant="nav" />
            {/* Customer: Staff link */}
            {!isStaff && (
              <button
                onClick={() => navigate('/staff/login')}
                className="ml-3 pl-3 text-xs text-text-faint hover:text-text-muted transition-colors"
                style={{ borderLeft: '1px solid var(--border)' }}
              >
                Staff →
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile bottom nav ───────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass"
        style={{ borderTop: '1px solid #2E2318' }}
      >
        <div className={`grid ${mobileGridCols}`}>
          {navItems.map(({ path, label, icon: Icon }) => {
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
        {/* Mobile: Staff logout row when authenticated */}
        {isStaff && isStaffRoute && (
          <div
            className="flex items-center justify-between px-4 py-2"
            style={{ borderTop: '1px solid #2E2318', backgroundColor: '#0D0B0A' }}
          >
            <span className="text-xs text-text-faint">Logged in as Staff</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs text-error"
            >
              <LogOut className="w-3 h-3" /> Logout
            </button>
          </div>
        )}
      </nav>
    </>
  )
}