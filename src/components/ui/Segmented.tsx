import type { ReactNode } from 'react'
import { cn } from './cn'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
  hint?: string
}

export interface SegmentedProps<T extends string> {
  /** Accessible name of the group. */
  label: string
  value: T | null
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  className?: string
}

/** Single-choice segmented control (radio group). */
export default function Segmented<T extends string>({ label, value, onChange, options, className }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('grid auto-cols-fr grid-flow-col gap-1 rounded-control bg-surface-2 p-1', className)}
    >
      {options.map(opt => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex min-h-11 flex-col items-center justify-center rounded-[8px] border px-3 py-2 text-[15px] font-medium',
              'transition-[background-color,border-color,color] duration-150',
              selected ? 'border-transparent bg-ink text-bg' : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            <span className="flex items-center gap-2 [&>svg]:h-[18px] [&>svg]:w-[18px]">
              {opt.icon}
              {opt.label}
            </span>
            {opt.hint && <span className={cn('mt-0.5 text-xs font-normal', selected ? 'text-bg' : 'text-ink-muted')}>{opt.hint}</span>}
          </button>
        )
      })}
    </div>
  )
}
