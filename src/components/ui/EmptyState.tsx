import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from './cn'

export interface EmptyStateProps {
  icon: LucideIcon
  title: ReactNode
  body?: ReactNode
  action?: ReactNode
  /** 1 when the empty state is the whole page (not found, session ended). */
  level?: 1 | 2
  className?: string
}

export default function EmptyState({ icon: Icon, title, body, action, level = 2, className }: EmptyStateProps) {
  const Heading = level === 1 ? 'h1' : 'h2'
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
        <Icon className="h-[22px] w-[22px]" aria-hidden />
      </div>
      <Heading className="font-display text-xl text-ink">{title}</Heading>
      {body && <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
