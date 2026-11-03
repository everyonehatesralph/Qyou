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
      <p className="text-sm font-medium text-accent-text">{eyebrow}</p>
      <h2 className="mt-3 text-balance font-display text-[32px] leading-[1.1] tracking-[-0.02em] text-ink sm:text-[40px]">{title}</h2>
      {body && <p className="mt-4 text-[17px] leading-relaxed text-ink-muted">{body}</p>}
    </div>
  )
}
