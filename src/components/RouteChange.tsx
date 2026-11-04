import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { RESTAURANT } from '../config/restaurant'
import { focusMain } from './ui/focus'

// Page titles, matched in order. Tabs, history and screen readers use them (WCAG 2.4.2).
const TITLES: [RegExp, string][] = [
  [/^\/$/, 'Qyou — Don’t queue. Just Qyou.'],
  [/^\/(t|table)\//, `Check in · ${RESTAURANT.name}`],
  [/^\/menu/, `Menu · ${RESTAURANT.name}`],
  [/^\/cart/, `Your cart · ${RESTAURANT.name}`],
  [/^\/order\//, `Your order · ${RESTAURANT.name}`],
  [/^\/my-orders/, `Your orders · ${RESTAURANT.name}`],
  [/^\/takeaway-pickup/, `Pickup board · ${RESTAURANT.name}`],
  [/^\/expired/, 'Session ended · Qyou'],
  [/^\/staff\/login/, 'Staff sign in · Qyou'],
  [/^\/staff\/dashboard/, 'Dashboard · Qyou staff'],
  [/^\/staff\/kitchen/, 'Kitchen · Qyou staff'],
  [/^\/staff\/tables/, 'Tables · Qyou staff'],
  [/^\/staff\/menu/, 'Menu · Qyou staff'],
  [/^\/staff\/sales/, 'Analytics · Qyou staff'],
  [/^\/staff\/qr-codes/, 'QR codes · Qyou staff'],
  [/^\/staff\/metrics/, 'Metrics · Qyou staff'],
]

/** First stop for keyboard users: jumps past the header and navigation (WCAG 2.4.1). */
export function SkipLink() {
  return (
    <a
      href="#main"
      onClick={e => { e.preventDefault(); focusMain(true) }}
      className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-bg shadow-pop focus:translate-y-0"
    >
      Skip to content
    </a>
  )
}

/**
 * On every screen change: a new title, back to the top (except Back/Forward, which
 * keep the browser's position), and focus on the new page so screen readers start
 * there instead of on a button that no longer exists.
 */
export default function RouteChange() {
  const { pathname } = useLocation()
  const type = useNavigationType()
  // The path the page last settled on; compared rather than a first-run flag, which
  // StrictMode's double effect run would flip and treat the first load as a navigation
  const settled = useRef(pathname)

  useEffect(() => {
    document.title = TITLES.find(([re]) => re.test(pathname))?.[1] ?? 'Page not found · Qyou'
    if (settled.current === pathname) return
    settled.current = pathname
    if (type !== 'POP') window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    // Pages load lazily: wait until the new main is in
    let tries = 0
    const id = window.setInterval(() => {
      if (focusMain() || ++tries > 20) window.clearInterval(id)
    }, 50)
    return () => window.clearInterval(id)
  }, [pathname, type])

  return null
}
