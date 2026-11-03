import { Link } from 'react-router-dom'
import { motion, useScroll, useSpring } from 'framer-motion'
import { Wordmark, buttonClasses } from '../../components/ui'

const SECTIONS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'FAQ', href: '#faq' },
]

export default function LandingHeader() {
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 })

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-glass backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:gap-8">
        <a href="#top" aria-label="Qyou, back to top" className="rounded-control py-2">
          <Wordmark size="sm" />
        </a>
        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {SECTIONS.map(s => (
            <a
              key={s.href}
              href={s.href}
              className="rounded-full px-3 py-2 text-[15px] font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              {s.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link to="/staff/login" className={buttonClasses({ variant: 'ghost' }, 'px-3 sm:px-4')}>
            Sign in
          </Link>
          <a href="#contact" className={buttonClasses({ variant: 'primary' }, 'px-4 sm:px-5')}>
            Book a demo
          </a>
        </div>
      </div>
      {/* Reading progress */}
      <motion.div style={{ scaleX: progress }} className="absolute inset-x-0 -bottom-px h-0.5 origin-left bg-accent" aria-hidden />
    </header>
  )
}
