import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wordmark, buttonClasses, cn } from '../../components/ui'

const SECTIONS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'FAQ', href: '#faq' },
]

// Always shown above this; scroll steps smaller than JITTER are ignored
const TOP = 80
const JITTER = 6

/** Hides while scrolling down past the top, and comes back the moment you scroll up. */
function useHideOnScroll() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let last = window.scrollY
    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      if (y < TOP) { setHidden(false); last = y; return }
      if (Math.abs(y - last) < JITTER) return
      setHidden(y > last)
      last = y
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame) }
  }, [])

  // Sticky things below the header (the pinned demo screen) follow it up and down
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--landing-header', hidden ? '0px' : '4rem')
    return () => { root.style.removeProperty('--landing-header') }
  }, [hidden])

  return hidden
}

export default function LandingHeader() {
  const hidden = useHideOnScroll()

  return (
    // Slides away on the way down; keyboard focus inside keeps it in view
    <header
      className={cn(
        'sticky top-0 z-40 bg-glass backdrop-blur-md transition-transform duration-[250ms] ease-[cubic-bezier(0.23,1,0.32,1)] focus-within:translate-y-0',
        hidden && '-translate-y-full',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6 lg:gap-8">
        <a href="#top" className="rounded-control py-2">
          <Wordmark size="sm" />
        </a>
        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {SECTIONS.map(s => (
            <a
              key={s.href}
              href={s.href}
              className="inline-flex h-11 items-center rounded-full px-3 text-[15px] font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
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
    </header>
  )
}
