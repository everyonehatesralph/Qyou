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
  sm: { text: 'text-[22px]', mark: 'h-7 w-6 text-sm [--notch:3px]' },
  md: { text: 'text-[28px]', mark: 'h-9 w-8 text-lg [--notch:5px]' },
  lg: { text: 'text-[44px]', mark: 'h-14 w-12 text-[26px] [--notch:7px]' },
}

/** The small ticket with a Q: Qyou's mark. */
export function TicketMark({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'ticket inline-flex shrink-0 -rotate-6 items-center justify-center rounded-[6px] bg-accent font-display leading-none text-on-accent',
        SIZES[size].mark,
        className,
      )}
    >
      Q
    </span>
  )
}

/** The "Qyou" product wordmark: ticket mark + name. */
export default function Wordmark({ size = 'md', withTagline, textOnly, className }: WordmarkProps) {
  return (
    <span className={cn('inline-flex flex-col', className)}>
      <span className="inline-flex items-center gap-2">
        {!textOnly && <TicketMark size={size} />}
        <span className={cn('font-display leading-none tracking-[-0.03em] text-ink', SIZES[size].text)}>{PRODUCT.name}</span>
      </span>
      {withTagline && <span className="mt-2 text-sm text-ink-muted">{PRODUCT.tagline}</span>}
    </span>
  )
}
