import { useLayoutEffect, useState, type ReactNode } from 'react'
import { cn } from './ui'

// Small single-series charts on the --chart token. One hue, thin bars with 4px
// rounded data ends on the baseline, 2px gaps, and a tooltip on hover/focus.
// Each bar is a labelled, focusable image. Text stays in text tokens.

/** Narrowest column a finger can still hit (WCAG 2.5.8 target size), and the gap between columns (gap-[2px] below). */
const MIN_COLUMN = 24
const GAP = 2

/**
 * How many columns fit side by side at MIN_COLUMN or wider, measured live on the element the
 * ref is given (the chart's box). Infinity until measured, which happens before the first paint.
 */
export function useColumnsThatFit<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    if (!node) return
    const measure = () => setWidth(node.getBoundingClientRect().width)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(node)
    return () => ro.disconnect()
  }, [node])
  // A pixel of slack so sub-pixel layouts never land a column just under the minimum
  const fits = width > 0 ? Math.max(1, Math.floor((width - 1 + GAP) / (MIN_COLUMN + GAP))) : Infinity
  return [setNode, fits] as const
}

export interface ColumnDatum {
  /** Text under the column. */
  label: string
  /** Fuller name for the tooltip and screen readers (e.g. "9am–11am"); defaults to the label. */
  name?: string
  value: number
  /** Tooltip / table text for the value, e.g. "3 orders · ₱1,040". */
  detail: string
  /** Bolds this column's label (e.g. today, the current hour). */
  emphasis?: boolean
}

interface ColumnChartProps {
  data: ColumnDatum[]
  /** What the chart shows, for screen readers and the table caption. */
  title: string
  height?: number
  /** Show every nth label below the bars (others stay in the tooltip). */
  labelEvery?: number
  /** Grow to fill a flex-column parent; `height` becomes the minimum. */
  fill?: boolean
  className?: string
}

/** Vertical bars, one per item; hover or focus a bar to read its value. */
export function ColumnChart({ data, title, height = 140, labelEvery = 1, fill = false, className }: ColumnChartProps) {
  const max = Math.max(1, ...data.map(d => d.value))
  // Every nth label, plus the emphasized one with room cleared around it
  const marked = data.findIndex(d => d.emphasis)
  const showLabel = (i: number) =>
    data[i].emphasis || (i % labelEvery === 0 && (marked < 0 || Math.abs(i - marked) >= labelEvery))
  return (
    <figure role="group" aria-label={title} className={cn(fill && 'flex flex-col', className)}>
      {/* A one-row grid so bar percentages resolve even when the height comes from flex */}
      <div
        className={cn('grid grid-flow-col grid-rows-1 auto-cols-fr gap-[2px] border-b border-line', fill && 'flex-1')}
        style={fill ? { minHeight: height } : { height }}
      >
        {data.map((d, i) => (
          <div
            key={d.label}
            tabIndex={0}
            role="img"
            aria-label={`${d.name ?? d.label}: ${d.detail}`}
            className="group relative flex min-w-0 cursor-default items-end rounded-t-[4px]"
          >
            {/* Hit target is the full column; the visible bar is the data */}
            <div
              className={cn(
                'w-full rounded-t-[4px] bg-chart transition-[height] duration-500',
                d.value === 0 && 'bg-transparent',
              )}
              style={{ height: d.value === 0 ? 0 : `${Math.max(4, (d.value / max) * 100)}%` }}
            />
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute bottom-full z-10 mb-1.5 whitespace-nowrap rounded-[8px] bg-ink px-2 py-1 text-xs font-medium text-bg opacity-0 shadow-pop transition-opacity duration-150',
                'group-hover:opacity-100 group-focus:opacity-100',
                // Keep tooltips on screen at the chart's edges
                i < data.length / 4 ? 'left-0' : i >= (data.length * 3) / 4 ? 'right-0' : 'left-1/2 -translate-x-1/2',
              )}
            >
              {d.name ?? d.label}: {d.detail}
            </span>
          </div>
        ))}
      </div>
      {/* Labels center on their column and may spill into the empty neighbours */}
      <div className="mt-1.5 flex gap-[2px]" aria-hidden>
        {data.map((d, i) => (
          <span key={d.label} className="flex min-w-0 flex-1 justify-center">
            <span className={cn('whitespace-nowrap text-xs', d.emphasis ? 'font-semibold text-ink' : 'text-ink-muted')}>
              {showLabel(i) ? d.label : ''}
            </span>
          </span>
        ))}
      </div>
    </figure>
  )
}

export interface BarDatum {
  label: ReactNode
  value: number
  /** Right-aligned value text. */
  detail: ReactNode
  key: string | number
}

/** Ranked horizontal bars with the name and value as text above each bar. */
export function BarList({ data, className, rank }: { data: BarDatum[]; className?: string; rank?: boolean }) {
  const max = Math.max(1, ...data.map(d => d.value))
  return (
    <ol className={cn('space-y-3', className)}>
      {data.map((d, i) => (
        <li key={d.key}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[15px]">
            <span className="min-w-0 text-ink">
              {rank && <span className="mr-2 tabular-nums text-ink-muted">{i + 1}</span>}
              {d.label}
            </span>
            <span className="shrink-0 text-sm tabular-nums text-ink-muted">{d.detail}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-2" aria-hidden>
            <div className="h-2 rounded-full bg-chart" style={{ width: `${Math.max((d.value / max) * 100, d.value > 0 ? 2 : 0)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  )
}
