import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, LayoutGroup, animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { Bell, Pause, Play } from 'lucide-react'
import { cn } from '../../components/ui'
import ItemPhoto from '../../components/ItemPhoto'
import { RESTAURANT } from '../../config/restaurant'
import { MENU_ITEMS } from '../../constants/menu'
import { peso } from '../../utils/formatters'
import { Reveal, useFitScale } from './motion'

// "For your team": a numbered list on one side, and on the other one screen that
// plays a short scene for the open item, like a cut from a product video.

const SCENES = [
  {
    id: 'orders',
    screen: 'Dashboard',
    title: 'Orders arrive live',
    body: 'New orders land on the dashboard the moment guests send them, with a sound. Confirm with one tap and they go to the kitchen.',
  },
  {
    id: 'kitchen',
    screen: 'Kitchen',
    title: 'A kitchen screen that keeps time',
    body: 'Tickets move from New to Preparing to Ready. Each one shows how long it has waited and turns amber after 10 minutes, red after 20.',
  },
  {
    id: 'menu',
    screen: 'Menu',
    title: 'Sold out in one switch',
    body: 'Switch an item off on the staff menu and guests see it as sold out. Switch it back on when it returns.',
  },
  {
    id: 'sales',
    screen: 'Analytics',
    title: 'Know how the day went',
    body: 'Revenue, orders by hour and top sellers for today, the last 7 or 30 days. Export it all to CSV.',
  },
] as const

type SceneId = (typeof SCENES)[number]['id']

// How long each scene stays before the next one plays
const HOLD_MS = 6500
// Scenes are drawn at this size and scaled to the stage
const STAGE_W = 460
const STAGE_H = 340
const EASE = [0.16, 1, 0.3, 1] as const

const menuItem = (id: number) => MENU_ITEMS.find(i => i.id === id)!

/** Steps through a scene's beats: 0 before the first, `beats` once all have played. */
function useBeats(beats: number, every: number, first = 450) {
  const reduce = useReducedMotion()
  const [beat, setBeat] = useState(reduce ? beats : 0)
  useEffect(() => {
    if (reduce) { setBeat(beats); return }
    const timers = Array.from({ length: beats }, (_, i) => setTimeout(() => setBeat(i + 1), first + i * every))
    return () => timers.forEach(clearTimeout)
  }, [beats, every, first, reduce])
  return beat
}

const enter = { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, x: 40 }, transition: { duration: 0.45, ease: EASE } }

// ─── Scene 1: an order arrives, is confirmed and moves to the kitchen ──────────────
function OrdersScene() {
  const beat = useBeats(4, 1100)
  const incoming = [
    beat >= 1 && beat < 3 && { id: 'a', table: 7, who: 'Ana', items: '1× Cold Brew, 1× Avocado Toast', total: menuItem(4).price + menuItem(9).price },
    beat >= 4 && { id: 'b', table: 2, who: 'Jun', items: '2× Matcha Latte', total: menuItem(3).price * 2 },
  ].filter(Boolean) as { id: string; table: number; who: string; items: string; total: number }[]

  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-[19px] text-ink">Incoming orders</p>
        <motion.span
          key={incoming.map(o => o.id).join()}
          animate={beat > 0 ? { rotate: [0, -14, 12, -8, 6, 0] } : undefined}
          transition={{ duration: 0.6 }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-ink"
        >
          <Bell className="h-4 w-4" />
        </motion.span>
      </div>
      <LayoutGroup>
        <div className="min-h-[104px] space-y-2">
          <AnimatePresence initial={false}>
            {incoming.map(o => (
              <motion.div key={o.id} layout {...enter} className="flex items-center gap-3 rounded-[10px] border border-line bg-surface p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink">Table {o.table} <span className="font-normal text-ink-muted">· {o.who}</span></p>
                  <p className="mt-0.5 truncate text-[12px] text-ink-muted">{o.items}</p>
                </div>
                <span className="text-[13px] tabular-nums text-ink">{peso(o.total)}</span>
                <motion.span
                  animate={o.id === 'a' && beat === 2 ? { scale: [1, 0.92, 1] } : { scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-[8px] bg-accent px-3 py-1.5 text-[12px] font-semibold text-on-accent"
                >
                  Confirm
                </motion.span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <motion.div layout className="border-t border-line pt-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">In the kitchen</p>
          <div className="mt-2 space-y-2">
            <AnimatePresence initial={false}>
              {beat >= 3 && (
                <motion.div key="a" layout initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: EASE }}
                  className="flex items-center justify-between rounded-[10px] bg-surface-2 px-3 py-2.5 text-[13px]">
                  <span className="text-ink">Table 7 · 2 items</span>
                  <span className="rounded-full bg-status-progress-bg px-2 py-0.5 text-[11px] font-medium text-status-progress-text">Preparing</span>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-center justify-between rounded-[10px] bg-surface-2 px-3 py-2.5 text-[13px]">
              <span className="text-ink">Table 4 · 3 items</span>
              <span className="rounded-full bg-status-ready-bg px-2 py-0.5 text-[11px] font-medium text-status-ready-text">Ready</span>
            </div>
          </div>
        </motion.div>
      </LayoutGroup>
    </div>
  )
}

// ─── Scene 2: tickets move across the kitchen board and the clock turns amber ──────
type Col = 'new' | 'cooking' | 'ready'
interface Ticket { id: string; table: number; items: string[]; mins: number; col: Col }

function KitchenScene() {
  const beat = useBeats(4, 1000)
  const tickets: Ticket[] = [
    { id: 't7', table: 7, items: ['1× Cold Brew', '1× Avocado Toast'], mins: 2, col: beat >= 1 ? 'cooking' : 'new' },
    { id: 't4', table: 4, items: ['2× Caramel Macchiato', '1× Butter Croissant'], mins: beat >= 2 ? 10 : 9, col: beat >= 3 ? 'ready' : 'cooking' },
    { id: 't9', table: 9, items: ['1× Club Sandwich'], mins: 4, col: 'ready' },
    ...(beat >= 4 ? [{ id: 't2', table: 2, items: ['2× Matcha Latte'], mins: 0, col: 'new' as Col }] : []),
  ]
  const cols: { id: Col; label: string }[] = [
    { id: 'new', label: 'New' },
    { id: 'cooking', label: 'Preparing' },
    { id: 'ready', label: 'Ready' },
  ]
  return (
    <LayoutGroup>
      <div className="grid h-full grid-cols-3 gap-3 p-4">
        {cols.map(col => (
          <div key={col.id} className="min-w-0">
            <p className="mb-2 flex items-center justify-between px-0.5 font-mono text-[11px] uppercase tracking-widest text-ink-muted">
              {col.label}
              <span className="tabular-nums">{tickets.filter(t => t.col === col.id).length}</span>
            </p>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {tickets.filter(t => t.col === col.id).map(t => {
                  const late = t.col !== 'ready' && t.mins >= 10
                  return (
                    <motion.div
                      key={t.id}
                      layoutId={t.id}
                      layout
                      initial={{ opacity: 0, y: -12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 240, damping: 28 }}
                      className={cn(
                        'rounded-[10px] border-[1.5px] bg-surface p-2.5 transition-colors duration-500',
                        late ? 'border-status-waiting-text' : t.col === 'ready' ? 'border-status-ready-text' : 'border-line',
                      )}
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="font-display text-[20px] leading-none text-ink">T{t.table}</span>
                        <span className={cn('font-mono text-[11px] tabular-nums transition-colors duration-500', late ? 'font-semibold text-status-waiting-text' : 'text-ink-muted')}>
                          {t.mins}m
                        </span>
                      </div>
                      <ul className="mt-2 space-y-0.5">
                        {t.items.map(i => <li key={i} className="truncate text-[11px] text-ink-muted">{i}</li>)}
                      </ul>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </LayoutGroup>
  )
}

// ─── Scene 3: one switch on the staff side greys the item on the guest's menu ──────
function MenuScene() {
  const beat = useBeats(2, 900, 900)
  const off = beat >= 1
  const shown = beat >= 2
  const rows = [2, 7, 3]
  return (
    <div className="grid h-full grid-cols-[1.1fr_1fr] gap-5 p-5">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">Staff menu</p>
        <ul className="mt-3 divide-y divide-line rounded-[10px] border border-line bg-surface">
          {rows.map(id => {
            const it = menuItem(id)
            const isOff = id === 7 && off
            return (
              <li key={id} className={cn('flex items-center gap-2.5 p-2.5 transition-colors duration-300', isOff && 'bg-surface-2')}>
                <ItemPhoto item={it} eager dimmed={isOff} className="h-9 w-9 shrink-0 rounded-[8px]" />
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-[13px] font-medium', isOff ? 'text-ink-muted' : 'text-ink')}>{it.name}</span>
                  <span className="block text-[11px] text-ink-muted">{isOff ? 'Sold out' : peso(it.price)}</span>
                </span>
                <span className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors duration-300', isOff ? 'bg-surface-3' : 'bg-accent')}>
                  <motion.span
                    animate={{ x: isOff ? 3 : 19 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                    className="absolute top-[3px] h-3.5 w-3.5 rounded-full bg-surface"
                  />
                </span>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">Guest menu</p>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {[2, 7].map(id => {
            const it = menuItem(id)
            const soldOut = id === 7 && shown
            return (
              <div key={id} className="min-w-0">
                <div className="relative">
                  <ItemPhoto item={it} eager dimmed={soldOut} className="aspect-square rounded-[8px] border border-line" />
                  <AnimatePresence>
                    {soldOut && (
                      <motion.span initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="absolute left-1.5 top-1.5 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-ink">
                        Sold out
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <p className={cn('mt-1.5 truncate text-[12px] font-semibold', soldOut ? 'text-ink-muted' : 'text-ink')}>{it.name}</p>
                <p className="text-[11px] tabular-nums text-ink-muted">{soldOut ? 'Sold out today' : peso(it.price)}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Scene 4: the day's revenue counts up, the hours fill in, top sellers line up ──
const HOURS = [3, 5, 9, 14, 11, 7, 6, 10, 13, 8]
const SELLERS = [{ id: 2, n: 38 }, { id: 3, n: 27 }, { id: 7, n: 21 }]

function Counter({ to, run }: { to: number; run: boolean }) {
  const reduce = useReducedMotion()
  const value = useMotionValue(reduce ? to : 0)
  // Thousands separated, as on the real Analytics page (₱12,480)
  const text = useTransform(value, v => `${RESTAURANT.currency}${Math.round(v).toLocaleString('en-PH')}`)
  useEffect(() => {
    if (!run || reduce) return
    const controls = animate(value, to, { duration: 1.4, ease: [...EASE] })
    return () => controls.stop()
  }, [run, reduce, to, value])
  return <motion.span className="tabular-nums">{text}</motion.span>
}

function SalesScene() {
  const beat = useBeats(3, 700, 300)
  const max = Math.max(...HOURS)
  return (
    <div className="grid h-full grid-cols-[1.35fr_1fr] gap-5 p-5">
      <div className="flex min-w-0 flex-col">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">Today</p>
        <p className="mt-1 font-display text-[34px] leading-none tracking-[-0.02em] text-ink">
          <Counter to={12480} run={beat >= 1} />
        </p>
        <p className="mt-1.5 text-[12px] text-ink-muted">86 orders · up 12% on yesterday</p>
        <div className="mt-auto flex h-[150px] items-end gap-[3px] border-b border-line">
          {HOURS.map((h, i) => (
            <motion.span
              key={i}
              initial={false}
              animate={{ scaleY: beat >= 2 ? h / max : 0.02 }}
              transition={{ duration: 0.6, delay: beat >= 2 ? i * 0.05 : 0, ease: EASE }}
              className={cn('h-full flex-1 origin-bottom rounded-t-[3px]', h === max ? 'bg-chart' : 'bg-surface-3')}
            />
          ))}
        </div>
        <p className="mt-1.5 flex justify-between font-mono text-[10px] text-ink-muted"><span>7am</span><span>12pm</span><span>4pm</span></p>
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">Top sellers</p>
        <ol className="mt-3 space-y-3">
          {SELLERS.map((s, i) => (
            <motion.li
              key={s.id}
              initial={false}
              animate={beat >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: 0.4, delay: beat >= 3 ? i * 0.12 : 0, ease: EASE }}
            >
              <p className="flex justify-between gap-2 text-[13px]">
                <span className="truncate text-ink">{menuItem(s.id).name}</span>
                <span className="tabular-nums text-ink-muted">{s.n}</span>
              </p>
              <span className="mt-1.5 block h-1.5 rounded-full bg-surface-2">
                <motion.span
                  initial={false}
                  animate={{ scaleX: beat >= 3 ? s.n / SELLERS[0].n : 0 }}
                  transition={{ duration: 0.7, delay: beat >= 3 ? 0.1 + i * 0.12 : 0, ease: EASE }}
                  className="block h-full origin-left rounded-full bg-ink"
                />
              </span>
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  )
}

const SCENE_VIEWS: Record<SceneId, () => ReactNode> = {
  orders: () => <OrdersScene />,
  kitchen: () => <KitchenScene />,
  menu: () => <MenuScene />,
  sales: () => <SalesScene />,
}

/** The screen the scenes play on: a plain window with the screen's name in its bar. */
function Stage({ active }: { active: SceneId }) {
  const [box, scale] = useFitScale<HTMLDivElement>(STAGE_W)
  const scene = SCENES.find(s => s.id === active)!
  return (
    <div className="overflow-hidden rounded-[12px] border border-line bg-bg" aria-hidden>
      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <span className="flex gap-1.5">
          {[0, 1, 2].map(i => <span key={i} className="h-2 w-2 rounded-full bg-surface-3" />)}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink-muted">
          {RESTAURANT.name} ·{' '}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={scene.screen} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="text-ink">
              {scene.screen}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-ink-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-status-ready-text" /> Live
        </span>
      </div>
      <div ref={box} className="relative aspect-[460/340]">
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}>
          {/* A cut between scenes: the old one lifts away, the new one settles in */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active}
              className="absolute inset-0"
              initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)', transition: { duration: 0.22 } }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              {SCENE_VIEWS[active]()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default function TeamFeatures() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { amount: 0.35 })
  const [active, setActive] = useState<SceneId>('orders')
  // Plays through the scenes on its own until someone picks one, pauses or hovers
  const [playing, setPlaying] = useState(true)
  const [hovered, setHovered] = useState(false)
  const running = playing && inView && !hovered && !reduce
  const ids = useId()

  useEffect(() => {
    if (!running) return
    const id = setTimeout(() => {
      const i = SCENES.findIndex(s => s.id === active)
      setActive(SCENES[(i + 1) % SCENES.length].id)
    }, HOLD_MS)
    return () => clearTimeout(id)
  }, [running, active])

  const pick = (id: SceneId) => { setActive(id); setPlaying(false) }

  return (
    <section id="features" ref={ref} className="px-2 py-4 sm:px-4">
      <div data-theme="dark" className="rounded-[28px] bg-surface text-ink sm:rounded-[36px]">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <Reveal className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-widest text-accent-text">For your team</p>
            <h2 className="mt-4 text-balance font-display text-[40px] leading-[0.95] tracking-[-0.04em] sm:text-[60px]">
              Built for the rush.
            </h2>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-muted">
              The counter, the kitchen and the office see the same orders as they happen. Staff sign in on any
              phone or tablet.
            </p>
          </Reveal>

          <div
            className="mt-14 grid gap-8 lg:mt-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-16"
            onPointerEnter={e => { if (e.pointerType === 'mouse') setHovered(true) }}
            onPointerLeave={() => setHovered(false)}
          >
            {/* On phones the screen stays in view while the list scrolls under it */}
            <Reveal delay={0.1} className="sticky top-[4.75rem] z-10 lg:static lg:order-2 short:static">
              <Stage active={active} />
            </Reveal>

            <div className="lg:order-1">
              <ul className="border-t border-line">
                {SCENES.map((s, i) => {
                  const open = s.id === active
                  return (
                    <motion.li
                      key={s.id}
                      className="border-b border-line"
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-60px' }}
                      transition={{ duration: 0.6, delay: 0.08 * i, ease: EASE }}
                    >
                      <h3>
                        <button
                          type="button"
                          id={`${ids}-${s.id}`}
                          aria-expanded={open}
                          aria-controls={`${ids}-${s.id}-body`}
                          onClick={() => pick(s.id)}
                          className="group flex w-full items-baseline gap-5 py-5 text-left"
                        >
                          <span className={cn('font-mono text-xs tabular-nums transition-colors duration-300', open ? 'text-accent-text' : 'text-ink-muted')}>
                            0{i + 1}
                          </span>
                          {/* While the tour plays, the open title fills in as its time runs */}
                          <span className="relative font-display text-[22px] leading-tight tracking-[-0.02em] sm:text-[26px]">
                            <span className={cn('transition-colors duration-300', open ? (running ? 'text-ink-muted' : 'text-ink') : 'text-ink-muted group-hover:text-ink')}>
                              {s.title}
                            </span>
                            {open && running && (
                              <motion.span
                                key={`${s.id}-fill`}
                                aria-hidden
                                className="absolute inset-0 text-ink"
                                initial={{ clipPath: 'inset(0 100% 0 0)' }}
                                animate={{ clipPath: 'inset(0 0% 0 0)' }}
                                transition={{ duration: HOLD_MS / 1000, ease: 'linear' }}
                              >
                                {s.title}
                              </motion.span>
                            )}
                          </span>
                        </button>
                      </h3>
                      {/* Rows open with a height transition (grid 0fr → 1fr) */}
                      <div
                        id={`${ids}-${s.id}-body`}
                        aria-hidden={!open}
                        className={cn('grid transition-[grid-template-rows] duration-500 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
                      >
                        <div className="overflow-hidden">
                          <p className={cn('max-w-md pb-6 pl-[calc(1.25rem+2ch)] text-[16px] leading-relaxed text-ink-muted transition-opacity duration-500', open ? 'opacity-100' : 'opacity-0')}>
                            {s.body}
                          </p>
                        </div>
                      </div>
                    </motion.li>
                  )
                })}
              </ul>

              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-sm text-ink-muted">Also in Qyou: printable table QR codes and CSV export.</p>
                {!reduce && (
                  <button
                    type="button"
                    onClick={() => setPlaying(p => !p)}
                    className="flex h-11 shrink-0 items-center gap-2 rounded-full px-3 font-mono text-xs uppercase tracking-widest text-ink-muted transition-colors hover:text-ink"
                  >
                    {playing ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
                    {playing ? 'Pause' : 'Play'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
