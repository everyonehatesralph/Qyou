import { Link } from 'react-router-dom'
import { ArrowRight, BellRing, Minus, Plus, Search } from 'lucide-react'
import { buttonClasses, LetterTile } from '../../components/ui'
import { PRODUCT } from '../../config/product'
import { RESTAURANT } from '../../config/restaurant'
import { MENU_ITEMS } from '../../constants/menu'

// Items shown in the phone preview, taken from the real demo menu
const PREVIEW = [
  { id: 2, qty: 1 },
  { id: 3, qty: 0 },
  { id: 7, qty: 1 },
  { id: 8, qty: 0, soldOut: true },
].map(p => ({ ...p, item: MENU_ITEMS.find(i => i.id === p.id)! }))

const previewCount = PREVIEW.reduce((s, p) => s + p.qty, 0)
const previewTotal = PREVIEW.reduce((s, p) => s + p.qty * p.item.price, 0)

function PhonePreview() {
  return (
    <div className="relative mx-auto w-full max-w-[330px] lg:mr-0">
      <p className="sr-only">Preview of the guest menu screen on a phone.</p>
      <div aria-hidden className="rounded-[2.6rem] border border-line-strong bg-surface p-2.5 shadow-pop">
        <div className="overflow-hidden rounded-[2.05rem] border border-line bg-bg">
          <div className="flex justify-center pt-2.5">
            <span className="h-[18px] w-24 rounded-full bg-surface-3" />
          </div>

          <div className="px-4 pb-3 pt-3">
            <div className="flex items-center gap-2.5">
              <LetterTile text={RESTAURANT.logoText} tone="accent" size="sm" className="h-9 w-9 text-base" />
              <div className="min-w-0">
                <p className="truncate font-display text-[17px] leading-tight text-ink">{RESTAURANT.name}</p>
                <p className="text-xs text-ink-muted">Hi Ana · Table 4</p>
              </div>
            </div>
            <div className="mt-3 flex h-10 items-center gap-2 rounded-control border border-line-strong bg-surface px-3 text-sm text-ink-faint">
              <Search className="h-4 w-4" />
              Search the menu
            </div>
            <div className="mt-3 flex gap-1.5 overflow-hidden">
              {['All', 'Coffee', 'Tea', 'Pastry'].map((c, i) => (
                <span
                  key={c}
                  className={
                    i === 0
                      ? 'rounded-full border border-ink bg-ink px-3 py-1.5 text-xs font-medium text-bg'
                      : 'rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted'
                  }
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          <ul className="divide-y divide-line border-y border-line bg-surface">
            {PREVIEW.map(({ item, qty, soldOut }) => (
              <li key={item.id} className={`flex items-center gap-3 px-4 py-3 ${soldOut ? 'opacity-55' : ''}`}>
                <LetterTile text={item.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                  <p className="text-[13px] text-ink-muted">{soldOut ? 'Sold out today' : `${RESTAURANT.currency}${item.price}`}</p>
                </div>
                {soldOut ? null : qty > 0 ? (
                  <span className="flex h-8 items-center gap-2 rounded-full border border-line-strong px-2 text-sm font-medium text-ink">
                    <Minus className="h-3.5 w-3.5" />
                    {qty}
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line-strong text-ink">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                )}
              </li>
            ))}
          </ul>

          <div className="px-3 pb-5 pt-10">
            <div className="flex h-12 items-center justify-between rounded-control bg-accent px-4 text-sm font-medium text-on-accent">
              <span>View cart · {previewCount} items</span>
              <span className="tabular-nums">{RESTAURANT.currency}{previewTotal}</span>
            </div>
          </div>
        </div>
      </div>

      {/* "Ready" notification, desktop only so it never overflows a phone screen */}
      <div
        aria-hidden
        className="absolute -left-40 top-[47%] hidden w-60 items-center gap-3 rounded-card border border-line bg-surface p-3 shadow-pop lg:flex"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-status-ready-bg text-status-ready-text">
          <BellRing className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">Your order is ready</p>
          <p className="text-[13px] text-ink-muted">Table 4 · {previewCount} items</p>
        </div>
      </div>
    </div>
  )
}

export default function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-10 sm:px-6 md:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10 lg:pb-24 lg:pt-20">
      <div>
        <p className="text-sm font-medium text-ink-muted">QR table ordering for cafés and restaurants</p>
        <h1 className="mt-4 font-display text-[46px] leading-[1.02] tracking-[-0.03em] text-ink sm:text-[64px] lg:text-[76px]">
          Don't queue.
          <br />
          Just Qyou.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
          Guests scan the code on their table, order from their own phone and get notified when it's ready.
          Your team sees every order the moment it's placed. No app to download, no line at the counter.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to={PRODUCT.demoTablePath} className={buttonClasses({ variant: 'primary', size: 'lg' })}>
            Try the live demo
            <ArrowRight />
          </Link>
          <a href="#contact" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
            Book a demo
          </a>
        </div>
        <p className="mt-4 text-sm text-ink-muted">The demo opens Table 1 at {RESTAURANT.name}.</p>
      </div>
      <PhonePreview />
    </section>
  )
}
