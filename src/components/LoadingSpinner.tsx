import { Loader2 } from 'lucide-react'
export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-text-muted text-sm">Loading…</p>
      </div>
    </div>
  )
}
