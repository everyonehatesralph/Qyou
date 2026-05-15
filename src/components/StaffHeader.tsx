import type { ReactNode, ComponentType } from 'react'
import { PanelLeft } from 'lucide-react'

interface Props {
  /** Page icon (lucide component) */
  icon: ComponentType<{ className?: string; style?: React.CSSProperties }>
  /** Page title shown as breadcrumb */
  title: string
  /** Optional right-side actions */
  actions?: ReactNode
  /** Optional sidebar toggle callback */
  onToggleSidebar?: () => void
}

/**
 * Square UI–style header bar for staff pages.
 *
 * Pattern from components/dashboard/header.tsx:
 *   - SidebarTrigger on the left
 *   - Page icon + title breadcrumb
 *   - Action buttons on the right (h-7 outlined)
 */
export default function StaffHeader({ icon: Icon, title, actions, onToggleSidebar }: Props) {
  return (
    <header
      className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 sticky top-0 z-10 w-full shrink-0"
      style={{ backgroundColor: '#171210', borderBottom: '1px solid #2E2318' }}
    >
      {/* Left: Trigger + Breadcrumb */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-colors md:hidden"
            style={{ color: '#9B8B7A' }}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-2" style={{ color: '#9B8B7A' }}>
          <Icon className="w-4 h-4" style={{ color: '#5C4F44' }} />
          <span className="text-sm font-medium">{title}</span>
        </div>
      </div>

      {/* Right: Action buttons */}
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  )
}

/**
 * Square UI outlined button for header actions.
 * Matches: Button variant="outline" size="sm" className="h-7 gap-1.5"
 */
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
  const styles = {
    outline: {
      backgroundColor: 'transparent',
      color: '#9B8B7A',
      border: '1px solid #2E2318',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#5C4F44',
      border: '1px solid transparent',
    },
    status: {
      backgroundColor: active ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
      color: active ? '#4ADE80' : '#F87171',
      border: `1px solid ${active ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
    },
  }[variant]

  return (
    <button
      onClick={onClick}
      className="hidden sm:flex items-center gap-1.5 h-7 px-2.5 rounded-md text-sm font-medium transition-all"
      style={styles}
      onMouseEnter={e => {
        if (variant === 'outline') {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'
          e.currentTarget.style.color = '#F0E6D3'
        }
      }}
      onMouseLeave={e => {
        if (variant === 'outline') {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = '#9B8B7A'
        }
      }}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span className="text-sm">{label}</span>
    </button>
  )
}

/** Vertical divider between header button groups */
export function HeaderDivider() {
  return <div className="h-5 w-px mx-1" style={{ backgroundColor: '#2E2318' }} />
}
