import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

/**
 * Staff page layout shell.
 * Provides the sidebar offset + background for all staff pages.
 * Content scrolls naturally (no viewport clipping).
 */
export default function StaffPageShell({ children }: Props) {
  return (
    <div
      className="min-h-screen md:ml-56"
      style={{ backgroundColor: '#0D0B0A' }}
    >
      {children}
    </div>
  )
}
