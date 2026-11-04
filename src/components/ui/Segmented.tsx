import { useRef, type KeyboardEvent, type ReactNode } from 'react'
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

/** Single-choice segmented control (radio group): one tab stop, arrow keys move and select. */
export default function Segmented<T extends string>({ label, value, onChange, options, className }: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const current = options.findIndex(o => o.value === value)

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (!step) return
    e.preventDefault()
    // From the focused option (nothing may be selected yet)
    const focused = refs.current.indexOf(document.activeElement as HTMLButtonElement)
    const from = focused >= 0 ? focused : Math.max(0, current)
    const next = (from + step + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('grid auto-cols-fr grid-flow-col gap-1 rounded-control bg-surface-2 p-1', className)}
    >
      {options.map((opt, i) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            ref={el => { refs.current[i] = el }}
            type="button"
            role="radio"
            aria-checked={selected}
            // Nothing chosen yet: the first option takes the tab stop
            tabIndex={selected || (current < 0 && i === 0) ? 0 : -1}
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
