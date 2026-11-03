import { PRODUCT } from '../../config/product'
import { cn } from './cn'

export interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg'
  withTagline?: boolean
  /** Hide the ticket mark and show the name only. */
  textOnly?: boolean
  className?: string
}

const SIZES = {
  sm: { text: 'text-[22px]', mark: 'h-8 w-8' },
  md: { text: 'text-[28px]', mark: 'h-10 w-10' },
  lg: { text: 'text-[44px]', mark: 'h-16 w-16' },
}

/** The ticket's outline: rounded, with a notch on each side. 64×64 grid. */
const TICKET_PATH = 'M17 6H47A11 11 0 0 1 58 17V27A5 5 0 0 0 58 37V47A11 11 0 0 1 47 58H17A11 11 0 0 1 6 47V37A5 5 0 0 0 6 27V17A11 11 0 0 1 17 6Z'

/**
 * Qyou's mark: a queue ticket with a Q, drawn as shapes so it looks the same on every
 * device. The same drawing as public/favicon.svg and the home-screen icon; colors come
 * from the theme, so it follows the restaurant's accent and dark mode.
 */
export function TicketMark({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn('shrink-0 -rotate-6', SIZES[size].mark, className)}>
      <path d={TICKET_PATH} className="fill-accent" />
      <g fill="none" strokeWidth={7} className="stroke-on-accent">
        <circle cx="32" cy="30" r="11.5" />
        <path d="M33.5 37.5L47.5 46" />
      </g>
    </svg>
  )
}

/** The "Qyou" product wordmark: ticket mark + name. */
export default function Wordmark({ size = 'md', withTagline, textOnly, className }: WordmarkProps) {
  return (
    <span className={cn('inline-flex flex-col', className)}>
      <span className="inline-flex items-center gap-1.5">
        {!textOnly && <TicketMark size={size} />}
        <span className={cn('font-display leading-none tracking-[-0.03em] text-ink', SIZES[size].text)}>{PRODUCT.name}</span>
      </span>
      {withTagline && <span className="mt-2 text-sm text-ink-muted">{PRODUCT.tagline}</span>}
    </span>
  )
}
