import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import IconButton from './IconButton'
import { cn } from './cn'

export interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  back?: () => void
  className?: string
}

export default function PageHeader({ title, subtitle, actions, back, className }: PageHeaderProps) {
  return (
    <header className={cn('flex items-start gap-2', className)}>
      {back && (
        <IconButton label="Back" onClick={back} className="-ml-2.5 mt-[-2px]">
          <ArrowLeft />
        </IconButton>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-[26px] leading-tight tracking-[-0.01em] text-ink md:text-[30px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
