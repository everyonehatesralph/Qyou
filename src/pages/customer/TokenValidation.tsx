import { Armchair, Users } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useState, useMemo, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useOrders } from '../../context/OrderContext'
import { RESTAURANT, tableLabel } from '../../config/restaurant'
import { Button, LetterTile, TextInput } from '../../components/ui'
import ThemeToggle from '../../components/ThemeToggle'

/** Table check-in: the page a table's QR code opens. */
export default function TokenValidation() {
  const navigate = useNavigate()
  const { tableId } = useParams()
  const { setTableSession } = useAuth()
  const { orders } = useOrders()
  const [name, setName] = useState('')
  const tid = Number(tableId) || 1
  const tname = tableLabel(tid)

  // A table with unpaid orders is treated as occupied
  const isTableOccupied = useMemo(() => {
    return orders.some(o => o.tableId === tid && o.status !== 'paid')
  }, [orders, tid])

  const handleContinue = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || isTableOccupied) return
    setTableSession(tid, tname, name.trim())
    navigate('/menu')
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg px-4">
      <div className="mx-auto flex w-full max-w-sm justify-end pt-3">
        <ThemeToggle className="-mr-2" />
      </div>

      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-16">
        <div className="text-center">
          <LetterTile text={RESTAURANT.logoText} tone="accent" size="lg" className="rounded-card" />
          <h1 className="mt-5 text-balance font-display text-[32px] leading-tight tracking-[-0.01em] text-ink">
            {RESTAURANT.name}
          </h1>
          <p className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink">
            <Armchair className="h-4 w-4 text-ink-muted" aria-hidden />
            {tname}
          </p>
        </div>

        {isTableOccupied ? (
          <div className="mt-10 rounded-card border border-line bg-surface p-5 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-status-waiting-bg text-status-waiting-text">
              <Users className="h-5 w-5" aria-hidden />
            </span>
            <h2 className="mt-3 font-display text-xl text-ink">This table is in use</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
              Someone is already ordering at {tname}. Please ask a staff member for a free table.
            </p>
          </div>
        ) : (
          <form onSubmit={handleContinue} className="mt-10">
            <TextInput
              label="Your name"
              placeholder="e.g. Ana"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="given-name"
              autoFocus
              hint="So staff know whose order it is."
            />
            <Button type="submit" variant="primary" size="lg" fullWidth disabled={!name.trim()} className="mt-5">
              Start ordering
            </Button>
          </form>
        )}
      </main>

      <p className="pb-6 text-center text-xs text-ink-muted">
        Ordering by <span className="font-display text-sm text-ink">Qyou</span>
      </p>
    </div>
  )
}
