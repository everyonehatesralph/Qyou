import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Lock, ChefHat } from 'lucide-react'
import ThemeToggle from '../../components/ThemeToggle'
export default function StaffLogin() {
  const navigate = useNavigate()
  const { staffLogin } = useAuth()
  const [pin, setPin]         = useState('')
  const [error, setError]     = useState(false)
  const [shaking, setShaking] = useState(false)
  const handleDigit = useCallback((d: string) => {
    if (pin.length >= 4) return
    setPin(prev => prev + d)
    setError(false)
  }, [pin])
  const handleBackspace = useCallback(() => {
    setPin(prev => prev.slice(0, -1))
    setError(false)
  }, [])
  const handleSubmit = useCallback(() => {
    if (pin.length < 4) return
    const ok = staffLogin(pin)
    if (ok) {
      navigate('/staff/dashboard', { replace: true })
    } else {
      setError(true)
      setShaking(true)
      setPin('')
      setTimeout(() => setShaking(false), 500)
    }
  }, [pin, staffLogin, navigate])
  const digits = ['1','2','3','4','5','6','7','8','9','','0','⌫']
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <ThemeToggle variant="floating" />
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-glow border border-primary/30 mb-5">
            <ChefHat className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text-base">Staff Access</h1>
          <p className="text-text-muted text-sm mt-1">Enter your 4-digit PIN</p>
        </div>
        {/* PIN dots */}
        <div className={`flex justify-center gap-4 mb-8 ${shaking ? 'animate-bounce' : ''}`}>
          {[0,1,2,3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                i < pin.length
                  ? 'bg-primary border-primary scale-110'
                  : error
                    ? 'border-error'
                    : 'border-border-light'
              }`}
            />
          ))}
        </div>
        {error && (
          <p className="text-center text-error text-sm mb-5 font-medium">
            Incorrect PIN. Try again.
          </p>
        )}
        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {digits.map((d, idx) => {
            if (d === '') return <div key={idx} />
            return (
              <button
                key={idx}
                onClick={() => d === '⌫' ? handleBackspace() : handleDigit(d)}
                className={`h-16 rounded-xl text-xl font-semibold transition-all duration-150 active:scale-95 ${
                  d === '⌫'
                    ? 'text-text-muted bg-surface-3 border border-border hover:border-border-light hover:text-text-base'
                    : 'text-text-base bg-surface-2 border border-border hover:border-primary/50 hover:bg-surface-3'
                }`}
              >
                {d}
              </button>
            )
          })}
        </div>
        <button
          onClick={handleSubmit}
          disabled={pin.length < 4}
          className="w-full py-4 btn-primary text-background font-bold text-lg rounded-xl
                     disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                     flex items-center justify-center gap-2"
        >
          <Lock className="w-5 h-5" />
          Unlock
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full mt-3 py-3 text-text-muted hover:text-text-base text-sm transition-colors"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  )
}