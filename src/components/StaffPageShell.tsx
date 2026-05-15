import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

/**
 * Square UI–style content shell for staff pages.
 *
 * Matches the exact layout from app/page.tsx:
 *   <div className="h-svh overflow-hidden lg:p-2 w-full">
 *     <div className="lg:border lg:rounded-md overflow-hidden flex flex-col
 *          items-center justify-start bg-container h-full w-full bg-background">
 *       <Header />
 *       <Content className="flex-1 overflow-auto" />
 *     </div>
 *   </div>
 *
 * Children should be:
 *   1. A <header> (sticky top bar)
 *   2. A <main className="flex-1 overflow-auto ..."> (scrollable content)
 */
export default function StaffPageShell({ children }: Props) {
  return (
    <div
      className="md:ml-56"
      style={{ backgroundColor: '#171210' }}
    >
      {/* h-svh = 100svh viewport, overflow-hidden clips at shell edge */}
      {/* pb-14 md:pb-0 accounts for mobile bottom nav bar */}
      <div className="h-svh overflow-hidden lg:p-2 w-full pb-14 md:pb-0">
        {/* Bordered rounded container on desktop — exact Square UI pattern */}
        <div
          className="lg:border lg:rounded-md overflow-hidden flex flex-col items-center justify-start h-full w-full"
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
