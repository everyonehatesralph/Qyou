import { AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
export default function ExpiredSession() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 pt-14">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-error-bg border border-error/30 mb-5">
          <AlertCircle className="w-8 h-8 text-error" />
        </div>
        <h1 className="text-2xl font-bold text-text-base mb-2">Session Expired</h1>
        <p className="text-text-muted text-sm mb-8 leading-relaxed">
          Your table session has expired. Please scan the QR code at your table to start a new session.
        </p>
        <button onClick={() => navigate('/')} className="w-full btn-primary py-4 rounded-xl text-background font-semibold">
          Back to Home
        </button>
      </div>
    </div>
  )
}