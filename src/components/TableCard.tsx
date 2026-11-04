import type { Order } from '../context/OrderContext'
import type { StatusGroup } from '../theme/status'
import { STATUS_GROUP_CLASSES } from '../theme/status'
import { peso } from '../utils/formatters'
import { Button, StatusPill, cn } from './ui'
import { orderRef, settleTable } from '../services/orderModel'

/** What "Free table" will do, in words, for the confirm dialog. */
export function settleSummary({ pay, cancel, keep, payTotal }: ReturnType<typeof settleTable>): string {
  const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`
  const prepaid = pay.filter(o => o.paidOnlineAt).length
  const collect = pay.length - prepaid
  const parts = [
    collect > 0 && `marks ${n(collect, 'served order', 'served orders')} paid (${peso(payTotal)})`,
    prepaid > 0 && `closes ${n(prepaid, 'order', 'orders')} already paid online`,
    cancel.length > 0 && `cancels ${n(cancel.length, 'order', 'orders')} the kitchen hasn't finished`,
  ].filter(Boolean)
  const kept = keep.length > 0
    ? ` ${n(keep.length, 'order', 'orders')} paid online ${keep.length === 1 ? 'stays' : 'stay'} with the kitchen until served.`
    : ''
  if (parts.length === 0) return kept ? kept.trim() : 'This table has no open orders.'
  const last = parts.pop()
  const said = parts.length > 0 ? `${parts.join(', ')} and ${last}` : last
  return `This ${said}, so new guests can check in.${kept}`
}

/** What a table needs next, from its open orders: new orders first, then ready, kitchen, served. */
export function tableState(orders: Order[]): { group: StatusGroup | null; label: string } {
  if (orders.length === 0) return { group: null, label: 'Free' }
  const has = (...s: Order['status'][]) => orders.some(o => s.includes(o.status))
  if (has('pending')) return { group: 'waiting', label: 'New order' }
  if (has('ready')) return { group: 'ready', label: 'Ready to serve' }
  if (has('confirmed', 'preparing')) return { group: 'progress', label: 'In the kitchen' }
  if (orders.some(o => o.status === 'served' && !o.paidOnlineAt)) return { group: 'done', label: 'Served, not paid' }
  return { group: 'cancelled', label: 'Cancelled order' }
}

interface Props {
  label: string
  /** The table's open orders (each page decides what "open" means). */
  orders: Order[]
  onFree?: () => void
  /** Compact tile for the dashboard grid; the full card lists each order. */
  compact?: boolean
}

export default function TableCard({ label, orders, onFree, compact }: Props) {
  const { group, label: stateLabel } = tableState(orders)
  const colors = group ? STATUS_GROUP_CLASSES[group] : null
  const bill = orders.reduce((s, o) => s + o.total, 0)

  return (
    <div
      className={cn(
        'flex flex-col rounded-card border',
        compact ? 'p-3' : 'p-4',
        colors ? cn(colors.bg, 'border-transparent') : 'border-line bg-surface',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn('font-display leading-tight text-ink', compact ? 'text-lg' : 'text-xl')}>{label}</p>
        {!compact && orders.length > 0 && <p className="text-[15px] font-medium tabular-nums text-ink">{peso(bill)}</p>}
      </div>
      <p className={cn('mt-0.5 text-sm font-medium', colors ? colors.text : 'text-ink-muted')}>{stateLabel}</p>

      {compact && orders.length > 0 && (
        <p className="mt-1 text-[13px] tabular-nums text-ink-muted">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'} · {peso(bill)}
        </p>
      )}

      {!compact && orders.length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded-control border border-line bg-surface">
          {orders.map(o => (
            <li key={o.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="min-w-0 break-words text-sm text-ink">
                {o.customerName || 'Guest'} <span className="text-ink-muted">· {orderRef(o)}</span>
              </span>
              <StatusPill status={o.status} />
            </li>
          ))}
        </ul>
      )}

      {!compact && orders.length === 0 && (
        <p className="mt-3 rounded-control border border-dashed border-line-strong px-3 py-4 text-center text-sm text-ink-muted">
          Ready for guests
        </p>
      )}

      {onFree && orders.length > 0 && (
        <Button
          variant={compact ? 'ghost' : 'secondary'}
          onClick={onFree}
          className={cn('mt-3', compact ? '-mx-1 -mb-1 justify-start px-2 text-sm' : 'w-full')}
        >
          Free table
        </Button>
      )}
    </div>
  )
}
