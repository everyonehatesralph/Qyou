import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BellRing, Check, Download, Flame, Minus, Plus, Search } from 'lucide-react'
import { LetterTile, cn } from '../../components/ui'
import ItemPhoto from '../../components/ItemPhoto'
import { RESTAURANT } from '../../config/restaurant'
import { MENU_ITEMS } from '../../constants/menu'
import { peso } from '../../utils/formatters'
import { useFitScale } from './motion'

const item = (id: number) => MENU_ITEMS.find(i => i.id === id)!

// Screens are drawn at this size and scaled to fit, so every phone keeps the same
// proportions however wide it is shown
const SCREEN_W = 260
const SCREEN_H = 564

/**
 * A plain phone outline around a real screen: no tilt, no depth, shown at about real size.
 * `top` shows only the upper part of the screen, for screens whose content is short.
 */
export function FlatPhone({ children, className, top }: { children: ReactNode; className?: string; top?: boolean }) {
  const [screen, scale] = useFitScale<HTMLDivElement>(SCREEN_W)
  return (
    <div className={cn('rounded-[2.4rem] border border-line-strong bg-surface p-2', className)}>
      <div ref={screen} data-theme="light" className={cn('relative overflow-hidden rounded-[2rem] border border-line bg-bg text-ink', top ? 'aspect-[9/12.5]' : 'aspect-[9/19.5]')}>
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: SCREEN_W, height: SCREEN_H, transform: `scale(${scale})` }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function AppHeader({ sub = 'Hi Ana · Table 4' }: { sub?: string }) {
  return (
    <div className="flex items-center gap-2 px-3.5 pb-2.5 pt-10">
      <LetterTile text={RESTAURANT.logoText} tone="accent" size="sm" className="h-8 w-8 text-sm" />
      <div className="min-w-0">
        <p className="truncate font-display text-[13px] leading-tight">{RESTAURANT.name}</p>
        <p className="text-[10px] text-ink-muted">{sub}</p>
      </div>
    </div>
  )
}

/** A card from the guest menu: photo, + (or the stepper), name and price. */
function PhotoCard({ id, qty, soldOut }: { id: number; qty: number; soldOut?: boolean }) {
  const it = item(id)
  return (
    <div className="relative min-w-0">
      <ItemPhoto item={it} eager dimmed={soldOut} className="aspect-square rounded-[10px] border border-line" />
      <div className="absolute inset-x-0 top-0 aspect-square">
        {soldOut ? (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-surface px-1.5 py-0.5 text-[9px] font-semibold text-ink">Sold out</span>
        ) : (
          <span className="absolute bottom-1.5 right-1.5">
            <AnimatePresence mode="popLayout" initial={false}>
              {qty > 0 ? (
                <motion.span
                  key="stepper"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  className="flex h-7 items-center gap-1.5 rounded-full border border-line bg-surface px-1.5 text-[11px] font-semibold shadow-lift"
                >
                  <Minus className="h-3 w-3" />
                  <motion.span key={qty} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-2.5 text-center tabular-nums">
                    {qty}
                  </motion.span>
                  <Plus className="h-3 w-3" />
                </motion.span>
              ) : (
                <motion.span key="add" exit={{ scale: 0.6, opacity: 0 }} className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface shadow-lift">
                  <Plus className="h-3 w-3" />
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        )}
      </div>
      <p className={cn('mt-1.5 truncate text-[11px] font-semibold', soldOut ? 'text-ink-muted' : 'text-ink')}>{it.name}</p>
      <p className="text-[11px] tabular-nums text-ink-muted">{soldOut ? 'Sold out today' : peso(it.price)}</p>
    </div>
  )
}

/** Section tabs with the underline under the current one. */
function SectionTabs({ current = 0 }: { current?: number }) {
  return (
    <div className="flex gap-3.5 border-b border-line px-3.5 text-[11px] font-semibold">
      {['Popular', 'Coffee', 'Tea', 'Pastry'].map((t, i) => (
        <span key={t} className={cn('relative pb-2 pt-1', i === current ? 'text-ink' : 'text-ink-muted')}>
          {t}
          {i === current && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-ink" />}
        </span>
      ))}
    </div>
  )
}

function CartBar({ count, total }: { count: number; total: number }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 70 }}
          animate={{ y: 0 }}
          exit={{ y: 70 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="absolute inset-x-2.5 bottom-3 flex h-10 items-center justify-between rounded-full bg-accent px-4 text-[11px] font-semibold text-on-accent"
        >
          <span>View cart · <motion.span key={count} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="inline-block">{count}</motion.span> items</span>
          <span className="tabular-nums">{peso(total)}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** The guest menu, used in the hero. */
export function MenuScreen() {
  return (
    <div className="absolute inset-0">
      <AppHeader />
      <div className="mx-3.5 flex h-8 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-[11px] text-ink-muted">
        <Search className="h-3 w-3" /> Search {RESTAURANT.shortName}
      </div>
      <div className="mt-2"><SectionTabs /></div>
      <p className="flex items-center gap-1 px-3.5 pt-3 font-display text-[14px]">
        <Flame className="h-3.5 w-3.5 text-accent-text" /> Popular
      </p>
      <div className="grid grid-cols-2 gap-x-2.5 gap-y-3 px-3.5 pt-2">
        <PhotoCard id={2} qty={1} />
        <PhotoCard id={3} qty={0} />
        <PhotoCard id={7} qty={1} />
        <PhotoCard id={8} qty={0} soldOut />
      </div>
      <CartBar count={2} total={item(2).price + item(7).price} />
    </div>
  )
}

const RECEIPT_LINES = [{ id: 2, qty: 2 }, { id: 7, qty: 1 }].map(l => ({ ...l, item: item(l.id) }))

// Receipts print like a ticket from a thermal printer: paper feeds out in eight short, eased
// bursts, then settles with a small swing. Shared with the kitchen printer in How it works.
const FEED_STEPS = 8
export const feed = (t: number) => {
  const i = Math.min(FEED_STEPS - 1, Math.floor(t * FEED_STEPS))
  const f = t * FEED_STEPS - i
  return (i + f * f * (3 - 2 * f)) / FEED_STEPS
}
export const FEED_DELAY = 0.35
export const FEED_DURATION = 1.6
const PRINTED = FEED_DELAY + FEED_DURATION

/** Step 3: the receipt prints onto the guest's phone as soon as they order; then Download receipt. */
export function ReceiptScreen() {
  const total = RECEIPT_LINES.reduce((s, l) => s + l.item.price * l.qty, 0)
  return (
    <div className="absolute inset-0 px-3.5">
      <AppHeader />
      <p className="mt-1 font-display text-[19px] leading-tight">Your receipt</p>
      <p className="text-[11px] text-ink-muted">Ready the moment you order.</p>
      <div className="relative mt-3">
        {/* The slot the paper comes out of */}
        <span className="absolute inset-x-0 top-0 z-10 h-1.5 rounded-full bg-ink" />
        {/* Clip only the top, so paper appears from the slot and its shadow stays whole */}
        <div className="mx-1.5 mt-[3px] [clip-path:inset(0_-1rem_-2rem_-1rem)]">
          <motion.div initial={{ y: '-100%' }} animate={{ y: 0 }} transition={{ delay: FEED_DELAY, duration: FEED_DURATION, ease: feed }}>
            <motion.div
              className="paper-shadow origin-top"
              animate={{ rotate: [0, 1.4, -0.8, 0.3, 0] }}
              transition={{ delay: PRINTED, duration: 0.9, ease: 'easeOut' }}
            >
              <div className="receipt-edge bg-surface px-3 pb-5 pt-3">
                <p className="text-center font-display text-[13px] leading-tight">{RESTAURANT.name}</p>
                <p className="mt-0.5 text-center font-mono text-[8px] uppercase tracking-widest text-ink-muted">Order receipt</p>
                <div className="perforation my-2" />
                <div className="space-y-0.5 text-[9px]">
                  <p className="flex justify-between"><span className="text-ink-muted">Order Nº</span><span>0427</span></p>
                  <p className="flex justify-between"><span className="text-ink-muted">Table</span><span>Table 4</span></p>
                  <p className="flex justify-between"><span className="text-ink-muted">Name</span><span>Ana</span></p>
                </div>
                <div className="perforation my-2" />
                <ul className="space-y-1 text-[10px]">
                  {RECEIPT_LINES.map(l => (
                    <li key={l.id} className="flex justify-between gap-2">
                      <span><span className="text-ink-muted">{l.qty}×</span> {l.item.name}</span>
                      <span className="tabular-nums">{peso(l.item.price * l.qty)}</span>
                    </li>
                  ))}
                </ul>
                <div className="perforation my-2" />
                <p className="flex justify-between font-display text-[12px]">
                  <span>Total</span>
                  <span className="tabular-nums">{peso(total)}</span>
                </p>
                <p className="mt-2 text-center text-[8px] text-ink-muted">Order receipt — not an official receipt</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
      {/* Once it has printed, Download receipt appears and is tapped */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0, scale: [1, 1, 0.94, 1] }}
        transition={{ opacity: { delay: PRINTED, duration: 0.3 }, y: { delay: PRINTED, duration: 0.3 }, scale: { delay: PRINTED + 0.8, duration: 0.45, times: [0, 0.01, 0.4, 1] } }}
        className="mt-3 flex h-9 items-center justify-center gap-1.5 rounded-full bg-accent text-[12px] font-semibold text-on-accent"
      >
        <Download className="h-3.5 w-3.5" strokeWidth={2.5} />
        Download receipt
      </motion.div>
    </div>
  )
}

/** Step 4: order sent, waiting on the kitchen. */
export function SentScreen() {
  return (
    <div className="absolute inset-0 px-3.5">
      <AppHeader />
      <p className="mt-2 font-display text-[19px] leading-tight">Order received</p>
      <p className="text-[11px] text-ink-muted">Waiting for staff to confirm it.</p>
      <div className="mt-3 rounded-[12px] border border-line bg-surface">
        <div className="flex items-baseline justify-between px-3 pt-3">
          <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Order Nº</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Table 4</span>
        </div>
        <p className="px-3 pb-3 font-display text-[30px] leading-none tracking-[-0.02em]">0427</p>
        <div className="perforation mx-3" />
        <ol className="space-y-2 p-3 text-[11px]">
          {['Received', 'Confirmed', 'Preparing', 'Ready'].map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={cn('flex h-4 w-4 items-center justify-center rounded-full', i === 0 ? 'bg-ink text-bg' : i === 1 ? 'border-2 border-ink' : 'border border-line-strong')}>
                {i === 0 && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                {i === 1 && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink" />}
              </span>
              <span className={i < 2 ? 'font-medium' : 'text-ink-muted'}>{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

/** Step 5: ready, ringing. */
export function ReadyScreen() {
  return (
    <div className="absolute inset-0">
      <div className="bg-status-ready-bg px-3.5 pb-5 text-status-ready-text">
        <AppHeader sub="Table 4" />
        <span className="mt-2 flex h-11 w-11 items-center justify-center rounded-full bg-surface">
          <BellRing className="h-5 w-5 animate-ring" />
        </span>
        <p className="mt-3 font-display text-[21px] leading-tight">Ready for you</p>
        <p className="text-[11px]">It is on its way to your table.</p>
      </div>
      <div className="mx-3.5 mt-4 rounded-[12px] border border-line bg-surface p-3 text-center">
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-muted">Order Nº 0427</p>
        <p className="mt-1 text-[12px] text-ink">2× Caramel Macchiato · 1× Butter Croissant</p>
      </div>
    </div>
  )
}
