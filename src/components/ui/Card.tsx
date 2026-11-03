import type { ElementType, HTMLAttributes } from 'react'
import { cn } from './cn'

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  padding?: 'none' | 'sm' | 'md'
  /** Adds hover and press feedback for clickable cards. */
  interactive?: boolean
}

const PADDING = { none: '', sm: 'p-3', md: 'p-4 sm:p-5' }

export default function Card({ as: Tag = 'div', padding = 'md', interactive, className, ...rest }: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-card border border-line bg-surface',
        PADDING[padding],
        interactive && 'cursor-pointer text-left transition-[border-color,background-color] duration-150 hover:border-line-strong active:bg-surface-2',
        className,
      )}
      {...rest}
    />
  )
}
