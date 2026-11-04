import type { ReactNode, ComponentType } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { IconButton, cn } from './ui'

interface Props {
  /** Page icon. Kept for older call sites; the header shows the title only. */
  icon?: ComponentType<{ className?: string }>
  title: string
  subtitle?: ReactNode
  /** Right-side actions */
  actions?: ReactNode
  /** Sidebar state for the collapse/expand button (768px and up) */
  sidebarExpanded?: boolean
  onSidebarToggle?: () => void
}

/** Sticky title bar at the top of every staff page. */
export default function StaffHeader({ title, subtitle, actions, sidebarExpanded, onSidebarToggle }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-glass backdrop-blur-md short:static">
      <div className="flex min-h-16 items-center gap-2 px-4 py-2 sm:px-6">
        {onSidebarToggle && (
          <IconButton
            label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            onClick={onSidebarToggle}
            className="-ml-2 hidden md:inline-flex"
          >
            {sidebarExpanded ? <PanelLeftClose /> : <PanelLeftOpen />}
          </IconButton>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-balance font-display text-[22px] leading-tight text-ink">{title}</h1>
          {subtitle && <p className="text-pretty text-[13px] text-ink-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}

/** Small outlined header action. Hidden below 640px. */
export function HeaderButton({
  icon: Icon,
  label,
  onClick,
  active,
  variant = 'outline',
}: {
  icon?: ComponentType<{ className?: string }>
  label: string
  onClick?: () => void
  active?: boolean
  variant?: 'outline' | 'ghost' | 'status'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'hidden h-9 items-center gap-1.5 rounded-control border px-3 text-sm font-medium transition-colors duration-150 sm:flex',
        variant === 'outline' && 'border-line-strong bg-surface text-ink hover:bg-surface-2',
        variant === 'ghost' && 'border-transparent text-ink-muted hover:bg-surface-2 hover:text-ink',
        variant === 'status' && (active
          ? 'border-transparent bg-status-ready-bg text-status-ready-text'
          : 'border-transparent bg-status-cancelled-bg text-status-cancelled-text'),
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {label}
    </button>
  )
}

/** Vertical divider between header button groups */
export function HeaderDivider() {
  return <div className="mx-1 hidden h-5 w-px bg-line sm:block" />
}
