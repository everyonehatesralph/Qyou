import { useEffect, useRef, useState } from 'react'
import { LayoutGroup, motion, useInView, useReducedMotion } from 'framer-motion'
import { BarChart3, ClipboardList, QrCode, ToggleRight } from 'lucide-react'
import { cn } from '../../components/ui'
import { Reveal, TiltCard } from './motion'

const FEATURES = [
  {
    icon: ClipboardList,
    title: 'Live order queue',
    body: 'New orders land on the dashboard the moment guests send them, with a sound. Confirm with one tap and they go to the kitchen.',
  },
  {
    icon: ToggleRight,
    title: 'Menu and sold-out control',
    body: 'Mark items sold out for the day from the staff menu screen, and switch them back on when they return.',
  },
  {
    icon: BarChart3,
    title: 'Sales tracker',
    body: 'Revenue, order counts, peak hours and top sellers for today, the last 7 or 30 days. Export to CSV.',
  },
  {
    icon: QrCode,
    title: 'Printable table QR codes',
    body: 'Print a card for every table with your restaurant’s name on it, or download each code as an image.',
  },
]

type Col = 'new' | 'cooking' | 'ready'
interface DemoTicket { id: string; table: number; items: string[]; mins: number; col: Col }

const START: DemoTicket[] = [
  { id: 'a', table: 7, items: ['1× Cold Brew', '1× Avocado Toast'], mins: 2, col: 'new' },
  { id: 'b', table: 2, items: ['2× Matcha Latte'], mins: 6, col: 'new' },
  { id: 'c', table: 4, items: ['2× Caramel Macchiato', '1× Butter Croissant'], mins: 11, col: 'cooking' },
  { id: 'd', table: 9, items: ['1× Club Sandwich'], mins: 8, col: 'ready' },
]
const NEXT: Record<Col, Col> = { new: 'cooking', cooking: 'ready', ready: 'new' }
const COLS: { id: Col; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'cooking', label: 'Preparing' },
  { id: 'ready', label: 'Ready' },
]

/** A small kitchen board that keeps moving tickets along while it is on screen. */
function KitchenBoard() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '-80px' })
  const reduce = useReducedMotion()
  const [tickets, setTickets] = useState(START)
  const [turn, setTurn] = useState(0)

  useEffect(() => {
    if (!inView || reduce) return
    const id = setInterval(() => setTurn(t => t + 1), 2200)
    return () => clearInterval(id)
  }, [inView, reduce])

  // Each turn: oldest ready ticket is served (back to New as a fresh order),
  // the longest-waiting cooking ticket becomes ready, the oldest new one starts cooking
  useEffect(() => {
    if (turn === 0) return
    setTickets(prev => {
      const order: Col[] = ['ready', 'cooking', 'new']
      const col = order[turn % 3]
      const target = prev.find(t => t.col === col)
      return prev.map(t => t === target
        ? { ...t, col: NEXT[t.col], mins: NEXT[t.col] === 'new' ? 0 : t.mins }
        : { ...t, mins: t.mins + (turn % 2) })
    })
  }, [turn])

  return (
    <div ref={ref} className="rounded-[20px] border border-line bg-bg p-3 sm:p-4" aria-hidden>
      <LayoutGroup>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {COLS.map(col => (
            <div key={col.id} className="min-w-0">
              <div className="mb-2 flex items-center justify-between rounded-[8px] bg-surface-2 px-2.5 py-1.5">
                <span className="text-xs font-semibold text-ink">{col.label}</span>
                <span className="font-mono text-[11px] text-ink-muted">{tickets.filter(t => t.col === col.id).length}</span>
              </div>
              <div className="min-h-[220px] space-y-2">
                {tickets.filter(t => t.col === col.id).map(t => {
                  const late = t.col !== 'ready' && t.mins >= 10
                  return (
                    <motion.div
                      key={t.id}
                      layoutId={t.id}
                      layout
                      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                      className={cn(
                        'rounded-[10px] border-2 bg-surface p-2.5',
                        late ? 'border-status-waiting-text' : t.col === 'ready' ? 'border-status-ready-text' : 'border-line',
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="font-display text-base leading-none text-ink sm:text-xl">T{t.table}</span>
                        <span className={cn('font-mono text-[10px]', late ? 'text-status-waiting-text' : 'text-ink-muted')}>{t.mins}m</span>
                      </div>
                      <ul className="mt-1.5 space-y-0.5">
                        {t.items.map(i => <li key={i} className="truncate text-[10px] text-ink-muted sm:text-xs">{i}</li>)}
                      </ul>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </LayoutGroup>
    </div>
  )
}

export default function TeamFeatures() {
  return (
    <section id="features" className="scroll-mt-16 px-2 py-4 sm:px-4">
      <div data-theme="dark" className="rounded-[28px] bg-surface text-ink sm:rounded-[36px]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-14">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-widest text-accent-text">For your team</p>
              <h2 className="mt-3 text-balance font-display text-[40px] leading-[0.95] tracking-[-0.04em] sm:text-[56px]">
                Built for the rush.
              </h2>
              <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-muted">
                A kitchen screen with big tickets sorted into New, Preparing and Ready. Each one shows how long it has waited
                and turns amber after 10 minutes, red after 20. Staff sign in on any phone or tablet.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <KitchenBoard />
            </Reveal>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.06}>
                <TiltCard className="h-full rounded-[20px] border border-line bg-bg p-5 sm:p-6">
                  <span className="ticket flex h-10 w-9 -rotate-6 items-center justify-center rounded-[6px] bg-accent text-on-accent [--notch:5px]">
                    <f.icon className="h-[18px] w-[18px]" aria-hidden />
                  </span>
                  <h3 className="mt-5 font-display text-xl leading-tight">{f.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{f.body}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-widest text-ink-muted">Everything above is in Qyou today.</p>
        </div>
      </div>
    </section>
  )
}
