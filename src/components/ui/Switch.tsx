import { cn } from './cn'

export interface SwitchProps {
  checked: boolean
  onChange: (next: boolean) => void
  /** Accessible name, e.g. "Caramel Macchiato available". */
  label: string
  className?: string
}

/** On/off switch with a 44px hit area. */
export default function Switch({ checked, onChange, label, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-11 w-[52px] shrink-0 items-center justify-center', className)}
    >
      <span
        className={cn(
          'relative h-7 w-12 rounded-full border transition-colors duration-150',
          checked ? 'border-accent bg-accent' : 'border-line-strong bg-surface-3',
        )}
      >
        <span
          className={cn(
            'absolute left-0 top-[3px] h-5 w-5 rounded-full border border-line bg-surface transition-transform duration-150',
            checked ? 'translate-x-[23px]' : 'translate-x-[3px]',
          )}
        />
      </span>
    </button>
  )
}
