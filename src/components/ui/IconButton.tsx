import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from './cn'

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Accessible name; also shown as the tooltip. */
  label: string
  children: ReactNode
  variant?: 'ghost' | 'outline'
}

/** Square 44px icon-only button. */
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, children, variant = 'ghost', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-muted',
        'transition-[background-color,color,transform] duration-150 hover:bg-surface-2 hover:text-ink active:scale-95',
        'disabled:pointer-events-none disabled:opacity-45 [&>svg]:h-5 [&>svg]:w-5',
        variant === 'outline' && 'border border-line bg-surface',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})

export default IconButton
