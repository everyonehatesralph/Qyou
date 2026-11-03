import type { ReactNode } from 'react'
import type { StatusGroup } from '../theme/status'
import { STATUS_GROUP_CLASSES } from '../theme/status'
import { Card, cn } from './ui'

interface Props {
  label: string
  value: ReactNode
  /** Adds a colored dot tying the number to a status group. */
  group?: StatusGroup
  hint?: ReactNode
  className?: string
}

/** Compact number card for staff dashboards. */
export default function KpiCard({ label, value, group, hint, className }: Props) {
  return (
    <Card padding="none" className={cn('p-4', className)}>
      <p className="flex items-center gap-2 text-sm text-ink-muted">
        {group && <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_GROUP_CLASSES[group].fill)} aria-hidden />}
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-2 text-[28px] font-medium leading-none tabular-nums tracking-[-0.01em] text-ink">{value}</p>
      {hint && <p className="mt-1.5 text-[13px] text-ink-muted">{hint}</p>}
    </Card>
  )
}
