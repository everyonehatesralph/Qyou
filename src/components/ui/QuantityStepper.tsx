import { useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Minus, Plus } from 'lucide-react'
import { cn } from './cn'

export interface QuantityStepperProps {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  /** Item name, used to label the buttons for screen readers. */
  itemName?: string
  /** Called with the + button when it adds one (e.g. to animate into the cart). */
  onIncrementFrom?: (button: HTMLButtonElement) => void
  className?: string
}

/** − n + control. Pressing minus at `min` calls onChange(min). The number ticks up or down. */
export default function QuantityStepper({ value, onChange, min = 0, max = 99, itemName, onIncrementFrom, className }: QuantityStepperProps) {
  const name = itemName ? ` ${itemName}` : ''
  const prev = useRef(value)
  const dir = value >= prev.current ? 1 : -1
  prev.current = value
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
      <span className="relative h-6 w-6 overflow-hidden text-center text-[15px] font-semibold tabular-nums text-ink" aria-live="polite">
        <AnimatePresence initial={false} mode="popLayout" custom={dir}>
          <motion.span
            key={value}
            custom={dir}
            className="absolute inset-0 leading-6"
            variants={{
              enter: (d: number) => ({ y: d * 14, opacity: 0 }),
              center: { y: 0, opacity: 1 },
              exit: (d: number) => ({ y: d * -14, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      <button
        type="button"
        className={btn}
        aria-label={`Add one${name}`}
        disabled={value >= max}
        onClick={e => { onChange(Math.min(max, value + 1)); onIncrementFrom?.(e.currentTarget) }}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
