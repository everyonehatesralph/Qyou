import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { BellRing, Check, Minus, Plus, Search } from 'lucide-react'
import { LetterTile, cn } from '../../components/ui'
import { RESTAURANT } from '../../config/restaurant'
import { MENU_ITEMS } from '../../constants/menu'
import { peso } from '../../utils/formatters'

const item = (id: number) => MENU_ITEMS.find(i => i.id === id)!

/**
 * A phone: dark frame in both modes, light screen like a product shot.
 * Children render inside the screen.
 */
export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div data-theme="dark" className={cn('relative rounded-[2.9rem] border border-line-strong bg-bg p-[9px] shadow-lift', className)}>
      <span aria-hidden className="absolute -left-[3px] top-28 h-12 w-[3px] rounded-l-sm bg-surface-3" />
      <span aria-hidden className="absolute -right-[3px] top-36 h-20 w-[3px] rounded-r-sm bg-surface-3" />
      <div data-theme="light" className="relative aspect-[9/19.5] overflow-hidden rounded-[2.35rem] bg-bg text-ink">
        <span aria-hidden data-theme="dark" className="absolute left-1/2 top-2 z-30 h-[22px] w-[86px] -translate-x-1/2 rounded-full bg-bg" />
        {children}
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

function MenuRow({ id, qty, soldOut }: { id: number; qty: number; soldOut?: boolean }) {
  const it = item(id)
  return (
    <li className={cn('flex items-center gap-2.5 px-3.5 py-2.5', soldOut && 'bg-surface-2')}>
      <LetterTile text={it.name} size="sm" className={cn('h-8 w-8 text-sm', soldOut && 'opacity-60')} />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-[12px] font-medium', soldOut ? 'text-ink-muted' : 'text-ink')}>{it.name}</p>
        <p className="text-[11px] text-ink-muted">{soldOut ? 'Sold out today' : peso(it.price)}</p>
      </div>
      {!soldOut && (
        <AnimatePresence mode="popLayout" initial={false}>
          {qty > 0 ? (
            <motion.span
              key="stepper"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              className="flex h-7 items-center gap-1.5 rounded-full border border-line-strong px-1.5 text-[11px] font-semibold"
            >
              <Minus className="h-3 w-3" />
              <motion.span key={qty} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-2.5 text-center tabular-nums">
                {qty}
              </motion.span>
              <Plus className="h-3 w-3" />
            </motion.span>
          ) : (
            <motion.span key="add" exit={{ scale: 0.6, opacity: 0 }} className="flex h-7 w-7 items-center justify-center rounded-full border border-line-strong">
              <Plus className="h-3 w-3" />
            </motion.span>
          )}
        </AnimatePresence>
      )}
    </li>
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
      <div className="mx-3.5 flex h-8 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-[11px] text-ink-faint">
        <Search className="h-3 w-3" /> Search the menu
      </div>
      <div className="flex gap-1 px-3.5 py-2.5">
        {['All', 'Coffee', 'Tea', 'Pastry'].map((c, i) => (
          <span key={c} className={cn('rounded-full border px-2.5 py-1 text-[10px] font-medium', i === 0 ? 'border-ink bg-ink text-bg' : 'border-line bg-surface text-ink-muted')}>
            {c}
          </span>
        ))}
      </div>
      <ul className="divide-y divide-line border-y border-line bg-surface">
        <MenuRow id={2} qty={1} />
        <MenuRow id={3} qty={0} />
        <MenuRow id={7} qty={1} />
        <MenuRow id={8} qty={0} soldOut />
        <MenuRow id={4} qty={0} />
      </ul>
      <CartBar count={2} total={item(2).price + item(7).price} />
    </div>
  )
}

/** Step 1: the phone camera framing the table's QR card. */
export function ScanScreen() {
  return (
    <div data-theme="dark" className="absolute inset-0 bg-bg">
      <div className="absolute inset-x-0 top-[18%] flex justify-center">
        <div data-theme="light" className="w-[62%] -rotate-3 rounded-[10px] bg-surface p-3 text-center text-ink shadow-pop">
          <p className="font-display text-[11px] leading-tight">{RESTAURANT.name}</p>
          <p className="text-[9px] text-ink-muted">Table 4</p>
          <div className="mx-auto mt-2 w-fit">
            <QRCodeSVG value="https://qyou.app/t/4" size={92} fgColor="black" bgColor="white" level="M" />
          </div>
          <p className="mt-2 text-[10px] font-semibold">Scan to order</p>
        </div>
      </div>
      {/* Viewfinder corners and scan line */}
      <div className="absolute inset-x-[14%] top-[15%] h-[42%]">
        {['left-0 top-0 border-l-2 border-t-2 rounded-tl-xl', 'right-0 top-0 border-r-2 border-t-2 rounded-tr-xl', 'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-xl', 'bottom-0 right-0 border-b-2 border-r-2 rounded-br-xl'].map(c => (
          <span key={c} className={cn('absolute h-6 w-6 border-accent', c)} />
        ))}
        <motion.span
          className="absolute inset-x-2 h-0.5 rounded-full bg-accent"
          animate={{ top: ['8%', '92%', '8%'] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 300, damping: 26 }}
        className="absolute inset-x-4 bottom-14 rounded-2xl bg-surface px-3.5 py-2.5"
      >
        <p className="text-[10px] text-ink-muted">Camera found a link</p>
        <p className="text-[12px] font-semibold text-ink">Open {RESTAURANT.shortName} · Table 4</p>
      </motion.div>
    </div>
  )
}

/** Step 2: items being added, cart bar sliding up. */
export function OrderScreen() {
  const [qty, setQty] = useState<[number, number, number]>([0, 0, 0])
  useEffect(() => {
    const steps: [number, number, number][] = [[1, 0, 0], [1, 1, 0], [2, 1, 0]]
    const timers = steps.map((s, i) => setTimeout(() => setQty(s), 450 + i * 650))
    return () => timers.forEach(clearTimeout)
  }, [])
  const ids = [2, 7, 3]
  const count = qty.reduce((a, b) => a + b, 0)
  const total = ids.reduce((s, id, i) => s + item(id).price * qty[i], 0)
  return (
    <div className="absolute inset-0">
      <AppHeader />
      <p className="px-3.5 pb-1.5 pt-1 font-display text-[13px]">Coffee</p>
      <ul className="divide-y divide-line border-y border-line bg-surface">
        {ids.map((id, i) => <MenuRow key={id} id={id} qty={qty[i]} />)}
        <MenuRow id={4} qty={0} />
      </ul>
      <CartBar count={count} total={total} />
    </div>
  )
}

/** Step 3: order sent, waiting on the kitchen. */
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

/** Step 4: ready, ringing. */
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
