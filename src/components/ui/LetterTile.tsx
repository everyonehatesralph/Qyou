import { cn } from './cn'

export interface LetterTileProps {
  text: string
  size?: 'sm' | 'md' | 'lg'
  /** neutral for menu items; accent for the restaurant's own logo tile. */
  tone?: 'neutral' | 'accent'
  className?: string
}

const SIZES = { sm: 'h-10 w-10 text-lg', md: 'h-12 w-12 text-xl', lg: 'h-14 w-14 text-2xl' }
const TONES = { neutral: 'bg-surface-2 text-ink-muted', accent: 'bg-accent text-on-accent' }

/** Rounded square showing the first letter of `text`; stands in for a photo or logo. */
export default function LetterTile({ text, size = 'md', tone = 'neutral', className }: LetterTileProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-control font-display leading-none',
        SIZES[size],
        TONES[tone],
        className,
      )}
    >
      {text.trim().charAt(0).toUpperCase()}
    </span>
  )
}
