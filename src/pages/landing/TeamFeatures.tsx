import { BarChart3, ClipboardList, QrCode, ToggleRight } from 'lucide-react'
import SectionHeading from './SectionHeading'

const FEATURES = [
  {
    icon: ClipboardList,
    title: 'Live order queue',
    body: 'New orders land on the dashboard the moment guests send them. Confirm with one tap and they go to the kitchen.',
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

interface PreviewCard { table: number; mins: number; items: string[]; late?: boolean }

const KITCHEN_COLUMNS: { title: string; cards: PreviewCard[] }[] = [
  { title: 'New', cards: [{ table: 7, mins: 2, items: ['1× Cold Brew', '1× Avocado Toast'] }] },
  { title: 'Preparing', cards: [{ table: 4, mins: 12, items: ['1× Caramel Macchiato', '1× Butter Croissant'], late: true }] },
  { title: 'Ready', cards: [{ table: 2, mins: 6, items: ['2× Matcha Latte'] }] },
]

/** A small kitchen screen, always dark like the real one. */
function KitchenPreview() {
  return (
    <div data-theme="dark" aria-hidden className="mt-6 rounded-card border border-line bg-bg p-3 text-ink">
      <div className="grid grid-cols-3 gap-2">
        {KITCHEN_COLUMNS.map(col => (
          <div key={col.title} className="min-w-0">
            <p className="px-1 pb-2 text-xs font-medium text-ink-muted">{col.title}</p>
            {col.cards.map(card => (
              <div
                key={card.table}
                className={`rounded-control border bg-surface p-2.5 ${card.late ? 'border-status-waiting-text' : 'border-line'}`}
              >
                <div className="flex items-baseline justify-between gap-1">
                  <span className="font-display text-lg leading-none sm:text-xl">T{card.table}</span>
                  <span className={`text-[11px] ${card.late ? 'text-status-waiting-text' : 'text-ink-muted'}`}>{card.mins} min</span>
                </div>
                <ul className="mt-2 space-y-0.5">
                  {card.items.map(i => (
                    <li key={i} className="truncate text-[11px] text-ink-muted sm:text-xs">{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TeamFeatures() {
  return (
    <section id="features" className="scroll-mt-16 border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <SectionHeading
          eyebrow="For your team"
          title="The screens behind the counter"
          body="Staff sign in on any phone or tablet. Everything below is in Qyou today."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-card border border-line bg-bg p-5 sm:p-6 md:col-span-2">
            <h3 className="font-display text-2xl text-ink">Kitchen screen</h3>
            <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-ink-muted">
              Big cards with the table number, items and notes, sorted into New, Preparing and Ready. Each card shows
              how long the order has waited and turns amber after 10 minutes, red after 20. Dark by default.
            </p>
            <KitchenPreview />
          </div>
          {FEATURES.map(f => (
            <div key={f.title} className="rounded-card border border-line bg-bg p-5 sm:p-6">
              <f.icon className="h-6 w-6 text-ink-muted" aria-hidden />
              <h3 className="mt-4 font-display text-xl text-ink">{f.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
