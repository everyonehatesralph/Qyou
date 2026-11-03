import { forwardRef, useId, type TextareaHTMLAttributes } from 'react'
import { fieldClasses } from './TextInput'
import { cn } from './cn'

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
  error?: string
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, className, id, rows = 3, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const noteId = `${inputId}-note`
  const note = error ?? hint

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? noteId : undefined}
        className={cn(fieldClasses(!!error), 'min-h-[44px] resize-none px-3.5 py-2.5 leading-relaxed')}
        {...rest}
      />
      {note && (
        <p id={noteId} className={cn('mt-1.5 text-sm', error ? 'text-status-cancelled-text' : 'text-ink-muted')}>
          {note}
        </p>
      )}
    </div>
  )
})

export default TextArea
