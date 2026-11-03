import { Link } from 'react-router-dom'
import { Wordmark, buttonClasses } from '../../components/ui'

const SECTIONS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'FAQ', href: '#faq' },
]

export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-glass backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:gap-8">
        <a href="#top" aria-label="Qyou, back to top" className="rounded-control py-2">
          <Wordmark size="sm" className="[&>span]:text-[22px]" />
        </a>
        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {SECTIONS.map(s => (
            <a
              key={s.href}
              href={s.href}
              className="rounded-control px-3 py-2 text-[15px] text-ink-muted transition-colors hover:text-ink"
            >
              {s.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link to="/staff/login" className={buttonClasses({ variant: 'ghost' }, 'px-3')}>
            Sign in
          </Link>
          <a href="#contact" className={buttonClasses({ variant: 'primary' })}>
            Book a demo
          </a>
        </div>
      </div>
    </header>
  )
}
