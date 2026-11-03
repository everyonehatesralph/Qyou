import type { ReactNode } from 'react'
import { cn } from './cn'

export interface TicketProps {
  children: ReactNode
  /** Tear-off part below the perforation (order number, code, table…). */
  stub?: ReactNode
  tone?: 'surface' | 'accent' | 'ink'
  className?: string
  bodyClassName?: string
  stubClassName?: string
}

const TONES = {
  surface: 'bg-surface text-ink',
  accent: 'bg-accent text-on-accent',
  ink: 'bg-ink text-bg',
}

/**
 * Queue ticket: a card with half-circle notches and a perforated line between
 * the body and the stub. The body's bottom corners and the stub's top corners
 * are cut with a CSS mask (.ticket), so together they form round notches on
 * any background. Wrap in a `drop-shadow-*` element for elevation.
 */
export default function Ticket({ children, stub, tone = 'surface', className, bodyClassName, stubClassName }: TicketProps) {
  if (!stub) {
    return <div className={cn('rounded-card', TONES[tone], className)}>{children}</div>
  }
  return (
    <div className={cn('flex flex-col', className)}>
      <div className={cn('ticket rounded-t-card [--notch-y:100%]', TONES[tone], bodyClassName)}>{children}</div>
      <div className={cn('ticket relative rounded-b-card [--notch-y:0%]', TONES[tone], stubClassName)}>
        <div className={cn('perforation absolute inset-x-4 -top-px', tone !== 'surface' && 'opacity-50')} aria-hidden />
        {stub}
      </div>
    </div>
  )
}
