import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from './cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  leftIcon?: ReactNode
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'bg-surface text-ink border border-line-strong hover:border-ink',
  ghost: 'bg-transparent text-ink hover:bg-surface-2',
  danger: 'bg-status-cancelled-bg text-status-cancelled-text border border-transparent hover:border-status-cancelled-text',
}

const SIZES: Record<ButtonSize, string> = {
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-[52px] px-6 text-base',
}

/** Button styling for elements that must be links (`<a>`, router `<Link>`). */
export function buttonClasses(
  { variant = 'secondary', size = 'md', fullWidth }: Pick<ButtonProps, 'variant' | 'size' | 'fullWidth'> = {},
  className?: string,
): string {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap select-none',
    'transition-[background-color,border-color,transform] duration-150 active:scale-[0.97]',
    'disabled:pointer-events-none disabled:border-transparent disabled:bg-surface-3 disabled:text-ink-muted [&>svg]:h-[18px] [&>svg]:w-[18px] [&>svg]:shrink-0',
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
    className,
  )
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', fullWidth, leftIcon, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses({ variant, size, fullWidth }, className)}
      {...rest}
    >
      {leftIcon && <span className="-ml-0.5 flex shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px]">{leftIcon}</span>}
      {children}
    </button>
  )
})

export default Button
