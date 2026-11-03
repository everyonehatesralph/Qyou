import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ArrowLeft, Delete, Lock } from 'lucide-react'
import ThemeToggle from '../../components/ThemeToggle'
import { RESTAURANT } from '../../config/restaurant'
import { Button, Wordmark, cn } from '../../components/ui'

const PIN_LENGTH = 4
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'] as const

export default function StaffLogin() {
  const navigate = useNavigate()
  const { staffLogin } = useAuth()
  const [pin, setPin]         = useState('')
  const [error, setError]     = useState(false)
  const [shaking, setShaking] = useState(false)

  const handleDigit = useCallback((d: string) => {
    setPin(prev => (prev.length >= PIN_LENGTH ? prev : prev + d))
    setError(false)
  }, [])

  const handleBackspace = useCallback(() => {
    setPin(prev => prev.slice(0, -1))
    setError(false)
  }, [])

  const handleSubmit = useCallback(() => {
    if (pin.length < PIN_LENGTH) return
    const ok = staffLogin(pin)
    if (ok) {
      navigate('/staff/dashboard', { replace: true })
    } else {
      setError(true)
      setShaking(true)
      setPin('')
      setTimeout(() => setShaking(false), 450)
    }
  }, [pin, staffLogin, navigate])

  // Physical keyboard: digits, Backspace, Enter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) handleDigit(e.key)
      else if (e.key === 'Backspace') { e.preventDefault(); handleBackspace() }
      // preventDefault stops Enter from also pressing a focused keypad button
      else if (e.key === 'Enter') { e.preventDefault(); handleSubmit() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleDigit, handleBackspace, handleSubmit])

  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg px-4">
      <div className="mx-auto flex w-full max-w-sm items-center justify-between pt-3">
        <Button variant="ghost" leftIcon={<ArrowLeft />} onClick={() => navigate('/')} className="-ml-3 text-ink-muted">
          Home
        </Button>
        <ThemeToggle className="-mr-2" />
      </div>

      <main className="mx-auto flex w-full max-w-[20rem] flex-1 flex-col justify-center pb-12">
        <div className="text-center">
          <Wordmark size="lg" />
          <h1 className="mt-6 font-display text-2xl text-ink">Staff sign in</h1>
          <p className="mt-1 text-sm text-ink-muted">{RESTAURANT.name} · Enter your 4-digit PIN</p>
        </div>

        <div
          className={cn('mt-8 flex justify-center gap-4', shaking && 'animate-shake')}
          role="img"
          aria-label={`${pin.length} of ${PIN_LENGTH} digits entered`}
        >
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <span
              key={i}
              className={cn(
                'h-3.5 w-3.5 rounded-full border-2 transition-[background-color,border-color,transform] duration-150',
                i < pin.length ? 'scale-110 border-ink bg-ink' : error ? 'border-status-cancelled-text' : 'border-line-strong',
              )}
            />
          ))}
        </div>

        <p className={cn('mt-4 h-5 text-center text-sm', error ? 'text-status-cancelled-text' : 'text-transparent')} aria-live="assertive">
          {error ? 'Incorrect PIN. Try again.' : ''}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {KEYS.map((k, idx) => {
            if (k === '') return <span key={idx} />
            const isBack = k === 'back'
            return (
              <button
                key={idx}
                type="button"
                onClick={() => (isBack ? handleBackspace() : handleDigit(k))}
                aria-label={isBack ? 'Delete last digit' : k}
                className={cn(
                  'flex h-16 items-center justify-center rounded-card text-2xl transition-[background-color,transform] duration-100 active:scale-95',
                  isBack ? 'text-ink-muted hover:bg-surface-2' : 'border border-line bg-surface text-ink hover:bg-surface-2',
                )}
              >
                {isBack ? <Delete className="h-6 w-6" /> : k}
              </button>
            )
          })}
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          leftIcon={<Lock />}
          disabled={pin.length < PIN_LENGTH}
          onClick={handleSubmit}
          className="mt-6"
        >
          Sign in
        </Button>
      </main>
    </div>
  )
}
