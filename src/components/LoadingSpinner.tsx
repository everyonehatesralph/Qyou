import { Loader2 } from 'lucide-react'

export default function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg" role="status">
      <Loader2 className="h-6 w-6 animate-spin text-ink-muted" aria-hidden />
      <span className="sr-only">Loading…</span>
    </div>
  )
}
