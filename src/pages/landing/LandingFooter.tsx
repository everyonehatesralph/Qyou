import { Link } from 'react-router-dom'
import { Wordmark } from '../../components/ui'
import { PRODUCT } from '../../config/product'

// The tagline is the hero's headline; the footer doesn't repeat it
export default function LandingFooter() {
  return (
    <footer>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-10 pt-16 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Wordmark size="lg" />
        {/* Links are 44px tall for thumbs; the negative margin keeps the row where it was */}
        <div className="-my-3 flex flex-wrap items-center gap-x-5 text-sm text-ink-muted">
          <a href="#how-it-works" className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-ink">How it works</a>
          <a href="#faq" className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-ink">FAQ</a>
          <Link to="/staff/login" className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-ink">Staff sign in</Link>
          <span className="font-mono text-xs uppercase tracking-widest">© {new Date().getFullYear()} {PRODUCT.name}</span>
        </div>
      </div>
    </footer>
  )
}
