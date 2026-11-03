import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean
}

/** Category filter chip. 40px tall, with the hit area extended to 44px. */
export default function Chip({ selected, className, children, type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        'relative inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-medium',
        'transition-[background-color,border-color,color] duration-150 after:absolute after:-inset-y-0.5 after:inset-x-0',
        selected
          ? 'border-ink bg-ink text-bg'
          : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
