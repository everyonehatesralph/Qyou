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
 * Staff page layout. From 768px the page sits in a bordered, rounded container
 * inset from a frame that matches the sidebar; below 768px it fills the screen
 * and leaves room for the bottom bar. Content scrolls with the page.
 */
export default function StaffPageShell({ children, theme, className }: Props) {
  const { expanded } = useSidebar()
  return (
    <div
      className={cn(
        'min-h-screen bg-bg transition-[padding] duration-200 md:bg-surface md:p-2',
        expanded ? 'md:pl-[248px]' : 'md:pl-[80px]',
      )}
    >
      {/* overflow-clip rounds the corners without breaking the sticky header */}
      <div
        data-theme={theme}
        className={cn(
          'min-h-screen bg-bg text-ink pb-[calc(4rem+env(safe-area-inset-bottom))] short:pb-[calc(3rem+env(safe-area-inset-bottom))]',
          'md:min-h-[calc(100vh-1rem)] md:overflow-clip md:rounded-sheet md:border md:border-line md:pb-0',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
