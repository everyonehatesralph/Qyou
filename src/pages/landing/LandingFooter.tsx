import { Link } from 'react-router-dom'
import { Wordmark } from '../../components/ui'
import { PRODUCT } from '../../config/product'

export default function LandingFooter() {
  return (
    <footer>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-10 pt-16 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <Wordmark size="lg" />
          <p className="mt-4 font-display text-[clamp(1.6rem,5vw,2.4rem)] leading-none tracking-[-0.03em] text-ink-muted">
            {PRODUCT.tagline}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
          <a href="#how-it-works" className="hover:text-ink">How it works</a>
          <a href="#faq" className="hover:text-ink">FAQ</a>
          <Link to="/staff/login" className="hover:text-ink">Staff sign in</Link>
          <span className="font-mono text-xs uppercase tracking-widest">© {new Date().getFullYear()} {PRODUCT.name}</span>
        </div>
      </div>
    </footer>
  )
}
