import { Link } from 'react-router-dom'
import { Wordmark } from '../../components/ui'
import { PRODUCT } from '../../config/product'

export default function LandingFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <Wordmark size="md" withTagline />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
          <Link to="/staff/login" className="hover:text-ink">Staff sign in</Link>
          <span>© {new Date().getFullYear()} {PRODUCT.name}</span>
        </div>
      </div>
    </footer>
  )
}
