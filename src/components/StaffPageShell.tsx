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
 * inset from a frame that matches the sidebar. The container is pinned to the
 * window like the sidebar and the content scrolls inside it, so its corners never
 * slide away. Below 768px, and on short screens, it fills the screen and scrolls
 * with the page (phones keep their collapsing browser toolbars), leaving room for
 * the bottom bar.
 */
export default function StaffPageShell({ children, theme, className }: Props) {
  const { expanded } = useSidebar()
  return (
    <div
      className={cn(
        'min-h-screen bg-bg transition-[padding] duration-200 md:bg-surface md:p-2',
        'md:h-dvh md:min-h-0 md:overflow-hidden short:md:!h-auto short:md:!min-h-screen short:md:!overflow-visible',
        expanded ? 'md:pl-[248px]' : 'md:pl-[80px]',
      )}
    >
      <div
        data-theme={theme}
        className={cn(
          'min-h-screen bg-bg text-ink pb-[calc(4rem+env(safe-area-inset-bottom))] short:pb-[calc(3rem+env(safe-area-inset-bottom))]',
          // The scroll area; focus jumps stop clear of the sticky page header
          'md:h-full md:min-h-0 md:overflow-y-auto md:overscroll-contain md:scroll-pt-20 md:rounded-sheet md:border md:border-line md:pb-0',
          // Short screens: page scroll; overflow-clip rounds the corners without breaking the sticky header
          'short:md:!h-auto short:md:!min-h-[calc(100vh-1rem)] short:md:!overflow-clip',
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
