import { Link } from 'react-router-dom'
import { Wordmark } from '../../components/ui'
import { PRODUCT } from '../../config/product'

export default function LandingFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Wordmark size="sm" />
        {/* Links are 44px tall for thumbs; the negative margin keeps the row where it was */}
        <div className="-my-3 flex flex-wrap items-center gap-x-5 text-sm text-ink-muted">
          <a href="#how-it-works" className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-ink">How it works</a>
          <a href="#faq" className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-ink">Questions</a>
          <Link to="/staff/login" className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-ink">Staff sign in</Link>
          <span>© {new Date().getFullYear()} {PRODUCT.name}</span>
        </div>
      </div>
    </footer>
  )
}
