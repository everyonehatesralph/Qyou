import type { ReactNode } from 'react'
import { useSidebar } from '../context/SidebarContext'
import { cn } from './ui'

interface Props {
  children: ReactNode
  /** Gives the page its own mode (the kitchen screen); defaults to the app's. */
  theme?: 'light' | 'dark'
  className?: string
}

/**
 * Content area of a staff page. Leaves room for the sidebar from 768px
 * (240px, or 72px collapsed) and for the bottom bar below 768px.
 */
export default function StaffPageShell({ children, theme, className }: Props) {
  const { expanded } = useSidebar()
  return (
    <div
      data-theme={theme}
      className={cn(
        'min-h-screen bg-bg text-ink transition-[padding] duration-200',
        'pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0',
        expanded ? 'md:pl-60' : 'md:pl-[72px]',
        className,
      )}
    >
      {children}
    </div>
  )
}
