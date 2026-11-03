import type { ComponentType, ReactNode } from 'react'
import { cn } from './cn'

export interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>
  title: ReactNode
  body?: ReactNode
  action?: ReactNode
  className?: string
}

export default function EmptyState({ icon: Icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
        <Icon className="h-[22px] w-[22px]" />
      </div>
      <h2 className="font-display text-xl text-ink">{title}</h2>
      {body && <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
