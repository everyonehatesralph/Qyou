import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ShoppingCart, UtensilsCrossed, ClipboardList, LayoutGrid, ChefHat, BookOpen, QrCode,
  LogOut, TrendingUp, Armchair, MoreHorizontal, ChevronRight, Sun, Moon, type LucideIcon,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useSidebar } from '../context/SidebarContext'
import { useTheme } from '../context/ThemeContext'
import CustomerHeader from './CustomerHeader'
import CartFlyLayer from './CartFly'
import { RESTAURANT } from '../config/restaurant'
import { BottomSheet, TicketMark, Wordmark, cn } from './ui'

const PILL_SPRING = { type: 'spring', stiffness: 420, damping: 34 } as const

interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  also?: string[]
}

const customerItems: NavItem[] = [
  { path: '/menu',      label: 'Menu',   icon: UtensilsCrossed },
  { path: '/cart',      label: 'Cart',   icon: ShoppingCart },
  { path: '/my-orders', label: 'Orders', icon: ClipboardList, also: ['/order/'] },
]

// Customer screens that show the header and bottom bar. Check-in, the pickup
// board and error pages stand alone.
const CUSTOMER_SHELL = ['/menu', '/cart', '/my-orders', '/order/']

// Metrics is reachable by URL only; its numbers are simulated.
const staffItems: NavItem[] = [
  { path: '/staff/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { path: '/staff/kitchen',   label: 'Kitchen',   icon: ChefHat },
  { path: '/staff/tables',    label: 'Tables',    icon: Armchair },
  { path: '/staff/menu',      label: 'Menu',      icon: BookOpen },
  { path: '/staff/sales',     label: 'Sales',     icon: TrendingUp },
  { path: '/staff/qr-codes',  label: 'QR codes',  icon: QrCode },
]
const STAFF_BAR = staffItems.slice(0, 4)
const STAFF_MORE = staffItems.slice(4)

function BottomBarButton({ item, active, onClick, badge, pillId, cartTarget }: {
  item: NavItem
  active: boolean
  onClick: () => void
  badge?: number
  /** Shared layout id so the active pill slides between tabs. */
  pillId: string
  /** Marks the icon the add-to-cart flight lands on. */
  cartTarget?: boolean
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-150',
        active ? 'text-ink' : 'text-ink-muted hover:text-ink',
      )}
    >
      <span className="relative flex h-8 w-14 items-center justify-center" data-cart-target={cartTarget || undefined}>
        {active && <motion.span layoutId={pillId} transition={PILL_SPRING} className="absolute inset-0 rounded-full bg-surface-2" aria-hidden />}
        <Icon className="relative h-5 w-5" aria-hidden />
        {!!badge && (
          <span
            key={badge}
            className="absolute -top-1 right-1.5 flex h-[18px] min-w-[18px] animate-pop items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold tabular-nums text-on-accent"
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      {item.label}
      {!!badge && <span className="sr-only">, {badge} items</span>}
    </button>
  )
}

function StaffNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const { staffLogout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { expanded } = useSidebar()
  const [moreOpen, setMoreOpen] = useState(false)
  const isActive = (path: string) => location.pathname.startsWith(path)

  const go = (path: string) => { setMoreOpen(false); navigate(path) }
  const signOut = () => { setMoreOpen(false); staffLogout(); navigate('/staff/login') }

  const rowClass = (active: boolean) => cn(
    'relative flex h-11 w-full items-center gap-3 rounded-full px-3.5 text-[15px] transition-colors duration-150',
    active ? 'font-semibold text-ink' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
    !expanded && 'justify-center px-0',
  )

  return (
    <>
      {/* Sidebar, 768px and up */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-surface transition-[width] duration-200 md:flex',
          expanded ? 'w-60' : 'w-[72px]',
        )}
      >
        <button
          type="button"
          onClick={() => navigate('/staff/dashboard')}
          className={cn('flex h-16 shrink-0 items-center gap-2 border-b border-line text-left', expanded ? 'px-5' : 'justify-center')}
          aria-label="Qyou staff dashboard"
        >
          {expanded ? (
            <span className="min-w-0">
              <Wordmark size="sm" />
              <span className="mt-1 block truncate text-xs text-ink-muted">{RESTAURANT.name}</span>
            </span>
          ) : (
            <TicketMark size="md" />
          )}
        </button>

        <nav aria-label="Staff" className="flex-1 space-y-1 overflow-y-auto p-3">
          {staffItems.map(item => {
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                aria-current={active ? 'page' : undefined}
                title={expanded ? undefined : item.label}
                className={rowClass(active)}
              >
                {active && (
                  <motion.span layoutId="staff-side-pill" transition={PILL_SPRING} className="absolute inset-0 rounded-full bg-surface-2" aria-hidden>
                    <span className="absolute left-1.5 top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-accent" />
                  </motion.span>
                )}
                <item.icon className="relative h-5 w-5 shrink-0" aria-hidden />
                {expanded ? <span className="relative">{item.label}</span> : <span className="sr-only">{item.label}</span>}
              </button>
            )
          })}
        </nav>

        <div className="space-y-1 border-t border-line p-3">
          <button type="button" onClick={toggleTheme} className={rowClass(false)} title={expanded ? undefined : 'Theme'}>
            {isDark ? <Sun className="h-5 w-5 shrink-0" aria-hidden /> : <Moon className="h-5 w-5 shrink-0" aria-hidden />}
            {expanded ? (isDark ? 'Light mode' : 'Dark mode') : <span className="sr-only">{isDark ? 'Light mode' : 'Dark mode'}</span>}
          </button>
          <button type="button" onClick={signOut} className={rowClass(false)} title={expanded ? undefined : 'Sign out'}>
            <LogOut className="h-5 w-5 shrink-0" aria-hidden />
            {expanded ? 'Sign out' : <span className="sr-only">Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Bottom bar, below 768px */}
      <nav
        aria-label="Staff"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="grid h-16 grid-cols-5">
          {STAFF_BAR.map(item => (
            <BottomBarButton key={item.path} item={item} pillId="staff-bar-pill" active={isActive(item.path)} onClick={() => navigate(item.path)} />
          ))}
          <BottomBarButton
            pillId="staff-bar-pill"
            item={{ path: '#more', label: 'More', icon: MoreHorizontal }}
            active={STAFF_MORE.some(i => isActive(i.path)) || moreOpen}
            onClick={() => setMoreOpen(true)}
          />
        </div>
      </nav>

      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More" description={RESTAURANT.name}>
        <div className="divide-y divide-line overflow-hidden rounded-card border border-line">
          {STAFF_MORE.map(item => (
            <button
              key={item.path}
              type="button"
              onClick={() => go(item.path)}
              className="flex h-14 w-full items-center gap-3 px-4 text-left text-[15px] text-ink transition-colors hover:bg-surface-2"
            >
              <item.icon className="h-5 w-5 text-ink-muted" aria-hidden />
              <span className="flex-1">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-ink-muted" aria-hidden />
            </button>
          ))}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-14 w-full items-center gap-3 px-4 text-left text-[15px] text-ink transition-colors hover:bg-surface-2"
          >
            {isDark ? <Sun className="h-5 w-5 text-ink-muted" aria-hidden /> : <Moon className="h-5 w-5 text-ink-muted" aria-hidden />}
            <span className="flex-1">{isDark ? 'Switch to light mode' : 'Switch to dark mode'}</span>
          </button>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="mt-3 flex h-14 w-full items-center gap-3 rounded-card border border-line px-4 text-left text-[15px] text-status-cancelled-text transition-colors hover:bg-status-cancelled-bg"
        >
          <LogOut className="h-5 w-5" aria-hidden />
          Sign out
        </button>
      </BottomSheet>
    </>
  )
}

export default function Navigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const { cartCount } = useCart()
  const { isStaff } = useAuth()
  const isStaffRoute = location.pathname.startsWith('/staff')

  // No navigation on the landing page or staff login
  if (location.pathname === '/' || location.pathname === '/staff/login') return null

  if (isStaffRoute) return isStaff ? <StaffNavigation /> : null

  if (!CUSTOMER_SHELL.some(p => location.pathname.startsWith(p))) return null

  // ── Customer: top header + bottom bar ──
  return (
    <>
      <CustomerHeader />
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-3">
          {customerItems.map(item => (
            <BottomBarButton
              key={item.path}
              item={item}
              active={location.pathname.startsWith(item.path) || !!item.also?.some(p => location.pathname.startsWith(p))}
              onClick={() => navigate(item.path)}
              badge={item.path === '/cart' ? cartCount : undefined}
              pillId="customer-bar-pill"
              cartTarget={item.path === '/cart'}
            />
          ))}
        </div>
      </nav>
      <CartFlyLayer />
    </>
  )
}
