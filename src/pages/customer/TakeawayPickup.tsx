import { QRCodeSVG } from 'qrcode.react'
import { Check, ShoppingBag } from 'lucide-react'
import { useOrders } from '../../context/OrderContext'
import { useMemo } from 'react'
import { LayoutGroup, motion } from 'framer-motion'
import { useNow, minutesSince } from '../../hooks/useNow'
import { RESTAURANT } from '../../config/restaurant'
import { EmptyState, StatusPill } from '../../components/ui'
import ThemeToggle from '../../components/ThemeToggle'

/** Pickup board for take-away orders, meant for a screen near the counter. */
export default function TakeawayPickup() {
  const { orders } = useOrders()
  const now = useNow(30_000)

  const { ready, inProgress } = useMemo(() => {
    const active = orders
      .filter(o => o.orderType === 'takeaway' && ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    return {
      ready: active.filter(o => o.status === 'ready'),
      inProgress: active.filter(o => o.status !== 'ready'),
    }
  }, [orders])

  const qrUrl = `${window.location.origin}/takeaway-pickup`

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-ink-muted">{RESTAURANT.name}</p>
            <h1 className="mt-1 font-display text-[36px] leading-tight text-ink md:text-[44px]">Take-away orders</h1>
            <p className="mt-2 max-w-md text-[15px] text-ink-muted">
              Find your pickup code below. Come to the counter when it moves to Ready.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* QR codes stay black on white so every phone camera can read them */}
            <div className="rounded-card border border-line bg-surface p-2">
              <QRCodeSVG value={qrUrl} size={112} level="M" fgColor="black" bgColor="white" includeMargin title="QR code for this pickup board" />
            </div>
            <p className="max-w-[9rem] text-sm text-ink-muted">Scan to follow this board on your phone.</p>
            <ThemeToggle className="self-start md:self-center" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {ready.length === 0 && inProgress.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No take-away orders right now" body="New take-away orders appear here as soon as they are placed." />
        ) : (
          <LayoutGroup>
          <div className="space-y-10">
            <section aria-labelledby="ready-heading">
              <h2 id="ready-heading" className="mb-4 flex items-center gap-2 font-display text-2xl text-ink">
                Ready for pickup
                <span className="text-base text-ink-muted">({ready.length})</span>
              </h2>
              {ready.length === 0 ? (
                <p className="text-[15px] text-ink-muted">Nothing ready yet.</p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {ready.map(order => (
                    <motion.li layoutId={order.id} layout transition={{ type: 'spring', stiffness: 260, damping: 28 }} key={order.id} className="ticket rounded-card bg-status-ready-bg px-3 py-5 text-center text-status-ready-text [--notch-y:62%] sm:px-5">
                      <p className="whitespace-nowrap font-mono text-[26px] leading-none sm:text-[40px]">{order.takeawayCode}</p>
                      <p className="mt-3 truncate text-[15px] font-medium">{order.customerName}</p>
                      <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium">
                        <Check className="h-4 w-4" aria-hidden /> Ready
                      </p>
                    </motion.li>
                  ))}
                </ul>
              )}
            </section>

            {inProgress.length > 0 && (
              <section aria-labelledby="progress-heading">
                <h2 id="progress-heading" className="mb-4 flex items-center gap-2 font-display text-2xl text-ink">
                  Being prepared
                  <span className="text-base text-ink-muted">({inProgress.length})</span>
                </h2>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {inProgress.map(order => (
                    <motion.li layoutId={order.id} layout transition={{ type: 'spring', stiffness: 260, damping: 28 }} key={order.id} className="ticket rounded-card bg-surface px-3 py-5 text-center [--notch-y:62%] sm:px-5">
                      <p className="whitespace-nowrap font-mono text-[22px] leading-none text-ink sm:text-[32px]">{order.takeawayCode}</p>
                      <p className="mt-3 truncate text-[15px] text-ink">{order.customerName}</p>
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                        <StatusPill status={order.status} audience="customer" />
                        <span className="text-xs text-ink-muted">{minutesSince(order.createdAt, now)} min</span>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </section>
            )}
          </div>
          </LayoutGroup>
        )}
      </main>

      <footer className="border-t border-line py-6 text-center text-sm text-ink-muted">
        Updates live · Questions? Ask a staff member.
      </footer>
    </div>
  )
}
