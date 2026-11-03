import type { ReactNode } from 'react'
import { cn } from '../../components/ui'

interface Props {
  eyebrow: string
  title: ReactNode
  body?: ReactNode
  className?: string
}

export default function SectionHeading({ eyebrow, title, body, className }: Props) {
  return (
    <div className={cn('max-w-2xl', className)}>
      <p className="font-mono text-[11px] uppercase tracking-widest text-accent-text">{eyebrow}</p>
      <h2 className="mt-3 text-balance font-display text-[36px] leading-[0.98] tracking-[-0.035em] text-ink sm:text-[48px]">{title}</h2>
      {body && <p className="mt-5 text-[17px] leading-relaxed text-ink-muted">{body}</p>}
    </div>
  )
}
