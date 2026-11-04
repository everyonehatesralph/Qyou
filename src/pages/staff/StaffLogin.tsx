import { useState, useCallback, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import type { StaffSignIn } from '../../services/orderSync'
import { ArrowLeft, Delete, Lock } from 'lucide-react'
import ThemeToggle from '../../components/ThemeToggle'
import { RESTAURANT } from '../../config/restaurant'
import { Button, Wordmark, cn } from '../../components/ui'

const PIN_LENGTH = 6
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'] as const

const SIGN_IN_ERRORS: Record<Exclude<StaffSignIn, 'ok'>, string> = {
  wrong_pin: 'Incorrect PIN. Try again.',
  not_staff: 'This account is not set up as staff yet.',
  too_many_attempts: 'Too many tries. Wait a few minutes and try again.',
  offline: "Can't reach the server. Check the connection and try again.",
}

export default function StaffLogin() {
  const navigate = useNavigate()
  const { staffLogin, isStaff, authReady } = useAuth()
  const [pin, setPin]           = useState('')
  const [error, setError]       = useState('')
  const [shaking, setShaking]   = useState(false)
  const [checking, setChecking] = useState(false)

  const handleDigit = useCallback((d: string) => {
    setPin(prev => (prev.length >= PIN_LENGTH ? prev : prev + d))
    setError('')
  }, [])

  const handleBackspace = useCallback(() => {
    setPin(prev => prev.slice(0, -1))
    setError('')
  }, [])

  const handleSubmit = useCallback(async () => {
    if (pin.length < PIN_LENGTH || checking) return
    setChecking(true)
    const result = await staffLogin(pin)
    setChecking(false)
    // On success isStaff flips and the redirect below takes over
    if (result !== 'ok') {
      setError(SIGN_IN_ERRORS[result])
      setShaking(true)
      setPin('')
      setTimeout(() => setShaking(false), 450)
    }
  }, [pin, checking, staffLogin])

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

  // Already signed in on this device
  if (authReady && isStaff) return <Navigate to="/staff/dashboard" replace />

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
          <p className="mt-1 text-sm text-ink-muted">{RESTAURANT.name} · Enter your {PIN_LENGTH}-digit PIN</p>
        </div>

        <div
          className={cn('mt-8 flex justify-center gap-4 short:mt-4', shaking && 'animate-shake')}
          role="status"
        >
          {/* Read out as digits go in; the dots are only for sight */}
          <span className="sr-only">{pin.length} of {PIN_LENGTH} digits entered</span>
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <span
              key={i}
              aria-hidden
              className={cn(
                'h-3.5 w-3.5 rounded-full border-2 transition-[background-color,border-color,transform] duration-150',
                i < pin.length ? 'scale-110 border-ink bg-ink' : error ? 'border-status-cancelled-text' : 'border-line-strong',
              )}
            />
          ))}
        </div>

        <p className={cn('mt-4 min-h-5 text-center text-sm', error ? 'text-status-cancelled-text' : 'text-transparent')} aria-live="assertive">
          {error}
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
                  'flex h-16 items-center justify-center rounded-card text-2xl short:h-12 transition-[background-color,transform] duration-100 active:scale-95',
                  isBack ? 'text-ink-muted hover:bg-surface-2' : 'border border-line bg-surface text-ink hover:bg-surface-2',
                )}
              >
                {isBack ? <Delete className="h-6 w-6" aria-hidden /> : k}
              </button>
            )
          })}
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          leftIcon={<Lock />}
          disabled={pin.length < PIN_LENGTH || checking}
          onClick={handleSubmit}
          className="mt-6"
        >
          {checking ? 'Checking…' : 'Sign in'}
        </Button>
      </main>
    </div>
  )
}
