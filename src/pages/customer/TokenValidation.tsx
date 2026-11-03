import { QrCode, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useState, useMemo, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useOrders } from '../../context/OrderContext'
import { useTables } from '../../context/TablesContext'
import LoadingSpinner from '../../components/LoadingSpinner'
import { RESTAURANT } from '../../config/restaurant'
import { isOpenOrder } from '../../services/orderModel'
import { Button, LetterTile, TextInput, Ticket } from '../../components/ui'
import ThemeToggle from '../../components/ThemeToggle'

/** Table check-in: the page a table's QR code opens. */
export default function TokenValidation() {
  const navigate = useNavigate()
  const { tableId } = useParams()
  const { setTableSession } = useAuth()
  const { orders } = useOrders()
  const [name, setName] = useState('')
  // Only tables the restaurant has open; a mistyped or old QR code gets a clear message
  const { tables, tablesLive } = useTables()
  const table = tables.find(t => String(t.id) === tableId)
  const tid = table?.id ?? 0
  const tname = table?.label ?? ''

  // Others at this table already ordered: this phone joins them, with its own name
  const othersOrdering = useMemo(() => orders.some(o => o.tableId === tid && isOpenOrder(o)), [orders, tid])

  const handleContinue = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !table) return
    setTableSession(tid, tname, name.trim())
    navigate('/menu')
  }

  // Staff may have added tables since this page loaded its starting list
  if (!table && !tablesLive) return <LoadingSpinner />
  if (!table) {
    return (
      <div className="flex min-h-[100dvh] flex-col bg-bg px-4">
        <div className="mx-auto flex w-full max-w-sm justify-end pt-3">
          <ThemeToggle className="-mr-2" />
        </div>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-16 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-status-waiting-bg text-status-waiting-text">
            <QrCode className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="mt-4 font-display text-2xl text-ink">This QR code isn't for a table here</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Scan the code on your table at {RESTAURANT.name}, or ask a staff member for help.
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg px-4">
      <div className="mx-auto flex w-full max-w-sm justify-end pt-3">
        <ThemeToggle className="-mr-2" />
      </div>

      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-16">
        <div className="text-center">
          <LetterTile text={RESTAURANT.logoText} tone="accent" size="lg" className="rounded-card" />
          <h1 className="mt-5 text-balance font-display text-[30px] leading-[1.05] tracking-[-0.03em] text-ink">
            {RESTAURANT.name}
          </h1>
          <motion.div
            initial={{ opacity: 0, y: 16, rotate: -6 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.1 }}
            className="mx-auto mt-6 w-[220px] drop-shadow-md"
          >
            <Ticket
              tone="accent"
              bodyClassName="px-5 pb-3 pt-4"
              stubClassName="px-5 pb-3.5 pt-2.5"
              stub={<p className="font-mono text-[10px] uppercase tracking-widest">Ordering by Qyou</p>}
            >
              <p className="font-mono text-[10px] uppercase tracking-widest">You're at</p>
              <p className="font-display text-[40px] leading-none tracking-[-0.03em]">{tname}</p>
            </Ticket>
          </motion.div>
        </div>

        {othersOrdering && (
          <p className="mt-8 flex items-start gap-2.5 rounded-card border border-line bg-surface p-4 text-sm leading-relaxed text-ink-muted">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-ink" aria-hidden />
            <span>Others at {tname} have ordered already. Your orders go on the same table bill, under your name.</span>
          </p>
        )}
        <form onSubmit={handleContinue} className={othersOrdering ? 'mt-5' : 'mt-10'}>
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
      </main>

      <p className="pb-6 text-center text-xs text-ink-muted">
        Ordering by <span className="font-display text-sm text-ink">Qyou</span>
      </p>
    </div>
  )
}
