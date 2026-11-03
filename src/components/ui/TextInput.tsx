import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from './cn'

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
  /** Keeps the label for screen readers but hides it visually. */
  hideLabel?: boolean
  leftIcon?: ReactNode
  /** Rendered inside the field on the right (e.g. a clear button). */
  rightSlot?: ReactNode
}

export const fieldClasses = (hasError?: boolean) => cn(
  'w-full rounded-control border bg-surface text-base text-ink placeholder:text-ink-faint outline-none',
  'transition-[border-color,box-shadow] duration-150 focus:border-accent focus:ring-[3px] focus:ring-accent-soft',
  hasError ? 'border-status-cancelled-text' : 'border-line-strong',
)

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { label, hint, error, hideLabel, leftIcon, rightSlot, className, id, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const noteId = `${inputId}-note`
  const note = error ?? hint

  return (
    <div className={className}>
      <label htmlFor={inputId} className={cn('mb-1.5 block text-sm font-medium text-ink', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 text-ink-muted [&>svg]:h-[18px] [&>svg]:w-[18px]">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          className={cn(fieldClasses(!!error), 'h-11 px-3.5', leftIcon && 'pl-10', rightSlot && 'pr-11')}
          {...rest}
        />
        {rightSlot && <span className="absolute right-0 top-1/2 flex -translate-y-1/2">{rightSlot}</span>}
      </div>
      {note && (
        <p id={noteId} className={cn('mt-1.5 text-sm', error ? 'text-status-cancelled-text' : 'text-ink-muted')}>
          {note}
        </p>
      )}
    </div>
  )
})

export default TextInput
