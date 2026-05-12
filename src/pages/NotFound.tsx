import { AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-warning-bg border border-warning/30 mb-5">
          <AlertTriangle className="w-8 h-8 text-warning" />
        </div>
        <h1 className="text-5xl font-bold text-text-base mb-2">404</h1>
        <p className="text-text-muted mb-8">This page doesn't exist.</p>
        <button onClick={() => navigate('/')} className="btn-primary py-3 px-8 rounded-xl text-background font-semibold">
          Go Home
        </button>
      </div>
    </div>
  )
}
