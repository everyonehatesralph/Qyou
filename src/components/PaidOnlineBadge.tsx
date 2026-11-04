import { BadgeCheck } from 'lucide-react'
import type { Order } from '../services/orderModel'
import { paymentLabel } from '../services/orderModel'
import { cn } from './ui'

/** "Paid · GCash" on an order paid online, so nobody asks the guest to pay again. */
export default function PaidOnlineBadge({ order, className }: { order: Pick<Order, 'paidOnlineAt' | 'paymentMethod'>; className?: string }) {
  if (!order.paidOnlineAt) return null
  return (
    <span className={cn('inline-flex items-center gap-1.5 self-start rounded-full bg-status-ready-bg px-2.5 py-1 text-xs font-medium text-status-ready-text', className)}>
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
      Paid · {paymentLabel(order.paymentMethod)}
    </span>
  )
}
