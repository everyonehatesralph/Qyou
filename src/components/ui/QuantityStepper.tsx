import { Minus, Plus } from 'lucide-react'
import { cn } from './cn'

export interface QuantityStepperProps {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  /** Item name, used to label the buttons for screen readers. */
  itemName?: string
  className?: string
}

/** − n + control. Pressing minus at `min` calls onChange(min). */
export default function QuantityStepper({ value, onChange, min = 0, max = 99, itemName, className }: QuantityStepperProps) {
  const name = itemName ? ` ${itemName}` : ''
  const btn = 'flex h-11 w-11 items-center justify-center rounded-full text-ink transition-[background-color,transform] duration-150 hover:bg-surface-2 active:scale-90 disabled:opacity-40 disabled:pointer-events-none'
  return (
    <div
      role="group"
      aria-label={`Quantity${name}`}
      className={cn('inline-flex h-11 shrink-0 items-center rounded-full border border-line-strong bg-surface', className)}
    >
      <button type="button" className={btn} aria-label={`Remove one${name}`} onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-6 text-center text-[15px] font-medium tabular-nums text-ink" aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} aria-label={`Add one${name}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
