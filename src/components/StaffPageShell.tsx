import type { ReactNode } from 'react'
import { useSidebar } from '../context/SidebarContext'

interface Props {
  children: ReactNode
}

/**
 * Staff page layout shell with Square UI bordered container.
 * - Syncs left margin with sidebar width (224px expanded / 80px collapsed)
 * - Smooth transition when sidebar collapses/expands
 * - lg:p-2 adds gap around the container on desktop
 * - lg:border lg:rounded-md creates the bordered container
 * - No h-svh — content scrolls naturally (full page scroll)
 */
export default function StaffPageShell({ children }: Props) {
  const { expanded: sidebarExpanded } = useSidebar()
  const sidebarWidth = sidebarExpanded ? 224 : 80

  return (
    <div
      className="h-screen transition-all duration-300 hidden md:flex flex-col overflow-hidden"
      style={{ 
        marginLeft: `${sidebarWidth}px`,
        backgroundColor: '#171210' 
      }}
    >
      {/* Desktop: padding around the bordered container with scrolling */}
      <div className="flex-1 lg:p-2 overflow-auto">
        {/* Bordered rounded container on desktop */}
        <div
          className="h-full lg:border lg:rounded-md overflow-hidden flex flex-col"
          style={{
            backgroundColor: '#0D0B0A',
            borderColor: '#2E2318',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
