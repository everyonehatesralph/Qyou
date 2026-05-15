import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

/**
 * Staff page layout shell with Square UI bordered container.
 * - lg:p-2 adds gap around the container on desktop
 * - lg:border lg:rounded-md creates the bordered container
 * - No h-svh — content scrolls naturally (full page scroll)
 */
export default function StaffPageShell({ children }: Props) {
  return (
    <div
      className="min-h-screen md:ml-56"
      style={{ backgroundColor: '#171210' }}
    >
      {/* Desktop: padding around the bordered container */}
      <div className="min-h-screen lg:p-2">
        {/* Bordered rounded container on desktop */}
        <div
          className="min-h-screen lg:border lg:rounded-md overflow-hidden flex flex-col"
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
