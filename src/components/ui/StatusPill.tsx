import type { OrderStatus } from '../../context/OrderContext'
import { STATUS_META, STATUS_GROUP_CLASSES } from '../../theme/status'
import { cn } from './cn'

export interface StatusPillProps {
  status: OrderStatus
  audience?: 'staff' | 'customer'
  className?: string
}

export default function StatusPill({ status, audience = 'staff', className }: StatusPillProps) {
  const meta = STATUS_META[status] ?? STATUS_META.pending
  const colors = STATUS_GROUP_CLASSES[meta.group]
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium',
        colors.bg,
        colors.text,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {audience === 'customer' ? meta.customerLabel : meta.label}
    </span>
  )
}
