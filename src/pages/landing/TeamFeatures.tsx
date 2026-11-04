import { StatusPill, buttonClasses } from '../../components/ui'
import { RESTAURANT } from '../../config/restaurant'

const FEATURES = [
  {
    title: 'New orders sound on the counter tablet.',
    body: 'Confirm with one tap and the order goes to the kitchen. Reject one that looks wrong.',
  },
  {
    title: 'The kitchen screen keeps time.',
    body: 'Each order shows how long it has waited, and turns amber after 10 minutes and red after 20.',
  },
  {
    title: 'You can see how the day went.',
    body: 'Sales, orders by hour and best sellers for today or the last 7 or 30 days, with a CSV export.',
  },
  {
    title: 'Table QR codes print from the staff screen.',
    body: 'One card per table, ready for a stand or a sticker.',
  },
]

const INCOMING = [
  { table: 'Table 7', name: 'Jun', items: '1× Cold Brew, 1× Butter Croissant', total: '₱250' },
  { table: 'Table 2', name: 'Mia', items: '2× Matcha Latte', total: '₱350' },
]

const KITCHEN = [
  { table: 'Table 4', items: '3 items', waited: '6 min', status: 'preparing' as const },
  { table: 'Table 9', items: '1 item', waited: '11 min', status: 'ready' as const },
]

/** The counter tablet as staff see it: a still picture, not a working screen. */
function CounterTablet() {
  return (
    <div className="rounded-card border border-line bg-surface p-5 sm:p-6" aria-hidden>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-lg font-bold">Incoming orders</p>
        <p className="text-sm text-ink-muted">{RESTAURANT.shortName}</p>
      </div>
      <ul className="mt-3 divide-y divide-line">
        {INCOMING.map(o => (
          <li key={o.table} className="flex items-center gap-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{o.table} · {o.name}</p>
              <p className="truncate text-sm text-ink-muted">{o.items}</p>
            </div>
            <p className="tabular-nums">{o.total}</p>
            <span className={buttonClasses({ variant: 'primary' }, 'h-9 px-4 text-sm')}>Confirm</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-lg font-bold">In the kitchen</p>
      <ul className="mt-3 divide-y divide-line">
        {KITCHEN.map(o => (
          <li key={o.table} className="flex items-center gap-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{o.table} · {o.items}</p>
              <p className="text-sm text-ink-muted">Waiting {o.waited}</p>
            </div>
            <StatusPill status={o.status} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function TeamFeatures() {
  return (
    <section id="features" className="border-t border-line bg-surface-2">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-28">
        <div>
          <h2 className="text-[clamp(1.75rem,3vw,2.25rem)] font-bold leading-tight tracking-[-0.015em]">What your staff see</h2>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-muted">
            The counter, the kitchen and whoever runs the place share one live list of orders, on any phone, tablet or laptop.
          </p>
          <dl className="mt-10 space-y-6">
            {FEATURES.map(f => (
              <div key={f.title}>
                <dt className="font-bold">{f.title}</dt>
                <dd className="mt-1 text-[15px] leading-relaxed text-ink-muted">{f.body}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="lg:pt-2">
          <CounterTablet />
        </div>
      </div>
    </section>
  )
}
