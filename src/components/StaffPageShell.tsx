import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

/**
 * Square UI–style content shell for staff pages.
 * On large screens: adds padding + a bordered rounded container.
 * On mobile: full-bleed.
 */
export default function StaffPageShell({ children }: Props) {
  return (
    <div className="min-h-screen md:ml-56" style={{ backgroundColor: '#171210' }}>
      <div className="h-svh overflow-hidden lg:p-2 w-full">
        <div
          className="lg:border lg:rounded-md overflow-hidden flex flex-col h-full w-full"
          style={{ backgroundColor: '#0D0B0A', borderColor: '#2E2318' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
