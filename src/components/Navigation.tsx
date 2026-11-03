import { useMemo, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  ShoppingCart, UtensilsCrossed, ClipboardList, LayoutGrid, ChefHat, BookOpen, QrCode,
  LogOut, TrendingUp, Armchair, MoreHorizontal, ChevronRight, Sun, Moon, type LucideIcon,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useOrders } from '../context/OrderContext'
import { useSidebar } from '../context/SidebarContext'
import { useTheme } from '../context/ThemeContext'
import CustomerHeader from './CustomerHeader'
import CartFlyLayer from './CartFly'
import { RESTAURANT } from '../config/restaurant'
import { BottomSheet, IconButton, LetterTile, TicketMark, cn } from './ui'

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
  { path: '/staff/sales',     label: 'Analytics', icon: TrendingUp },
  { path: '/staff/qr-codes',  label: 'QR codes',  icon: QrCode },
]
const STAFF_BAR = staffItems.slice(0, 4)
const STAFF_MORE = staffItems.slice(4)
// The sidebar groups: running service, then setting things up
const STAFF_GROUPS = [
  { id: 'service', label: 'Service', items: staffItems.slice(0, 3) },
  { id: 'manage', label: 'Manage', items: staffItems.slice(3) },
]

/** Live counts beside a nav item, in the same colors as the dashboard's cards. */
interface NavCount { count: number; label: string; tone: string; dot: string }

function BottomBarButton({ item, active, onClick, badge, badgeLabel = 'items', pillId, cartTarget }: {
  item: NavItem
  active: boolean
  onClick: () => void
  badge?: number
  /** What the badge counts, for screen readers ("3 new orders"). */
  badgeLabel?: string
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
        'relative flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-150 short:flex-row short:gap-2 short:text-[13px]',
        active ? 'text-ink' : 'text-ink-muted hover:text-ink',
      )}
    >
      <span className="relative flex h-8 w-14 items-center justify-center short:h-7 short:w-11" data-cart-target={cartTarget || undefined}>
        {active && <motion.span layoutId={pillId} transition={PILL_SPRING} className="absolute inset-0 rounded-full bg-ink" aria-hidden />}
        <Icon className={cn('relative h-5 w-5 transition-colors duration-150', active && 'text-bg')} aria-hidden />
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
      {!!badge && <span className="sr-only">, {badge} {badgeLabel}</span>}
    </button>
  )
}

function StaffNavigation() {
  const navigate = useNavigate()
  const location = useLocation()
  const { staffLogout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { expanded } = useSidebar()
  const { orders, isConnected } = useOrders()
  const [moreOpen, setMoreOpen] = useState(false)
  const isActive = (path: string) => location.pathname.startsWith(path)

  const go = (path: string) => { setMoreOpen(false); navigate(path) }
  const signOut = () => { setMoreOpen(false); staffLogout(); navigate('/staff/login') }

  const counts = useMemo<Record<string, NavCount>>(() => ({
    '/staff/dashboard': {
      count: orders.filter(o => o.status === 'pending').length,
      label: 'new orders',
      tone: 'bg-status-waiting-bg text-status-waiting-text',
      dot: 'bg-status-waiting-text',
    },
    '/staff/kitchen': {
      count: orders.filter(o => o.status === 'confirmed' || o.status === 'preparing').length,
      label: 'in the kitchen',
      tone: 'bg-status-progress-bg text-status-progress-text',
      dot: 'bg-status-progress-text',
    },
  }), [orders])

  return (
    <>
      {/* Sidebar, 768px and up. No divider lines: spacing separates the parts. */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col bg-surface transition-[width] duration-200 md:flex',
          expanded ? 'w-60' : 'w-[72px]',
        )}
      >
        {/* The restaurant, and whether orders are coming in live */}
        <div className={cn('flex min-h-[72px] shrink-0 items-center gap-3 pt-2', expanded ? 'px-4' : 'justify-center')}>
          <span className="relative shrink-0" title={expanded ? undefined : `${RESTAURANT.name} · ${isConnected ? 'Live' : 'Offline'}`}>
            <LetterTile text={RESTAURANT.logoText} tone="accent" size="sm" />
            <span
              className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface', isConnected ? 'bg-status-ready-text' : 'bg-status-waiting-text')}
              aria-hidden
            />
          </span>
          {expanded ? (
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold leading-tight text-ink">{RESTAURANT.name}</span>
              <span className="mt-0.5 block text-xs text-ink-muted">Staff · {isConnected ? 'Live' : 'Offline'}</span>
            </span>
          ) : (
            <span className="sr-only">{RESTAURANT.name}, {isConnected ? 'live' : 'offline'}</span>
          )}
        </div>

        <nav aria-label="Staff" className="mt-4 flex-1 overflow-y-auto px-3 pb-3">
          {STAFF_GROUPS.map((group, gi) => (
            <div key={group.id} className={cn(gi > 0 && 'mt-6')}>
              {expanded && (
                <p id={`staff-nav-${group.id}`} className="px-3 pb-2 font-mono text-xs uppercase tracking-widest text-ink-muted">
                  {group.label}
                </p>
              )}
              <ul
                className="space-y-1"
                aria-labelledby={expanded ? `staff-nav-${group.id}` : undefined}
                aria-label={expanded ? undefined : group.label}
              >
                {group.items.map(item => {
                  const active = isActive(item.path)
                  const live = counts[item.path]
                  const n = live?.count ?? 0
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        aria-current={active ? 'page' : undefined}
                        title={expanded ? undefined : item.label}
                        className={cn(
                          'relative flex h-11 w-full items-center gap-3 rounded-[12px] px-3 text-[15px] transition-colors duration-150',
                          active ? 'font-semibold text-ink' : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
                          !expanded && 'justify-center px-0',
                        )}
                      >
                        {active && (
                          <>
                            <motion.span layoutId="staff-side-pill" transition={PILL_SPRING} className="absolute inset-0 rounded-[12px] bg-surface-3" aria-hidden />
                            {/* A marker on the sidebar's edge, outside the pill */}
                            <motion.span layoutId="staff-side-edge" transition={PILL_SPRING} className="absolute -left-3 bottom-2.5 top-2.5 w-[3px] rounded-r-full bg-accent" aria-hidden />
                          </>
                        )}
                        <item.icon className={cn('relative h-5 w-5 shrink-0', active && 'text-accent-text')} aria-hidden />
                        {expanded ? <span className="relative flex-1">{item.label}</span> : <span className="sr-only">{item.label}</span>}
                        {n > 0 && (expanded ? (
                          <span key={n} className={cn('relative min-w-6 animate-pop rounded-full px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums', live.tone)}>
                            {n > 99 ? '99+' : n}
                          </span>
                        ) : (
                          <span className={cn('absolute right-3.5 top-2 h-2 w-2 rounded-full ring-2 ring-surface', live.dot)} aria-hidden />
                        ))}
                        {n > 0 && <span className="sr-only">, {n} {live.label}</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Product mark, then the two actions */}
        <div className={cn('flex shrink-0 gap-1 p-3', expanded ? 'items-center' : 'flex-col items-center')}>
          {expanded && (
            <span className="flex min-w-0 flex-1 items-center gap-2 px-2 text-xs text-ink-muted">
              <TicketMark size="sm" className="h-6 w-5 text-xs [--notch:3px]" />
              <span><span className="font-display text-[15px] text-ink">Qyou</span> staff</span>
            </span>
          )}
          <IconButton label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleTheme}>
            {isDark ? <Sun /> : <Moon />}
          </IconButton>
          <IconButton label="Sign out" onClick={signOut}>
            <LogOut />
          </IconButton>
        </div>
      </aside>

      {/* Bottom bar, below 768px */}
      <nav
        aria-label="Staff"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="grid h-16 grid-cols-5 short:h-12">
          {STAFF_BAR.map(item => (
            <BottomBarButton
              key={item.path}
              item={item}
              pillId="staff-bar-pill"
              active={isActive(item.path)}
              onClick={() => navigate(item.path)}
              badge={counts[item.path]?.count}
              badgeLabel={counts[item.path]?.label}
            />
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
        <div className="mx-auto grid h-16 max-w-md grid-cols-3 short:h-12">
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
