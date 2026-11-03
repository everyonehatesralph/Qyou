import { PRODUCT } from '../../config/product'
import { cn } from './cn'

export interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg'
  withTagline?: boolean
  className?: string
}

const SIZES = { sm: 'text-lg', md: 'text-2xl', lg: 'text-[40px]' }

/** The "Qyou" product wordmark. */
export default function Wordmark({ size = 'md', withTagline, className }: WordmarkProps) {
  return (
    <span className={cn('inline-flex flex-col', className)}>
      <span className={cn('font-display leading-none tracking-[-0.02em] text-ink', SIZES[size])}>
        {PRODUCT.name}
      </span>
      {withTagline && <span className="mt-1.5 text-sm text-ink-muted">{PRODUCT.tagline}</span>}
    </span>
  )
}
