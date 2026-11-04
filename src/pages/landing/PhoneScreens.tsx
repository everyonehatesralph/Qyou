import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { BellRing, Check, Flame, Minus, Plus, Search } from 'lucide-react'
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

// The body's corners (rounded-[17%/7.9%]) as fractions of its width and height
const CORNER_X = 0.17
const CORNER_Y = 0.079
// Thickness as a share of the width (a current phone is about 72mm wide and 8mm thick)
const THICKNESS = 0.1
// Flat facets per rounded corner of the band
const FACETS = 6
// Where the light comes from, on screen: above and a little to the left
const LIGHT = (() => { const x = -0.45, y = -0.9, l = Math.hypot(x, y); return [x / l, y / l] as const })()

/** Layout size of an element (ignores the 3D turn it is shown at). */
function useBoxSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setSize(s => (s.w === el.offsetWidth && s.h === el.offsetHeight ? s : { w: el.offsetWidth, h: el.offsetHeight }))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

/**
 * A strip standing on the outline: `length` along the edge, `height` deep into the phone,
 * centred on (x, y) at `z` and facing outwards at `facing` degrees (0 up, 90 right).
 */
function edgeStrip(x: number, y: number, length: number, height: number, z: number, facing: number): CSSProperties {
  return {
    left: x - length / 2,
    top: y - height / 2,
    width: length,
    height,
    transform: `translateZ(${z}px) rotateZ(${facing}deg) rotateX(90deg)`,
  }
}

/**
 * The phone's depth, drawn behind the screen in 3D: the metal band (flat strips along the
 * straight edges, narrow facets round the corners, each shaded by how much it faces the
 * light, with bright chamfers at the front and back), the buttons on the band, the back,
 * a soft shadow at the back and a blurred one on the page behind.
 */
function PhoneDepth({ w, h }: { w: number; h: number }) {
  if (!w || !h) return null
  const d = Math.round(w * THICKNESS)
  const rx = w * CORNER_X
  const ry = h * CORNER_Y

  // The outline, clockwise from the top edge; consecutive points make one face of the band
  const pts: [number, number][] = []
  const corner = (cx: number, cy: number, from: number) => {
    for (let i = 0; i <= FACETS; i++) {
      const a = ((from + (90 * i) / FACETS) * Math.PI) / 180
      pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)])
    }
  }
  corner(w - rx, ry, -90)
  corner(w - rx, h - ry, 0)
  corner(rx, h - ry, 90)
  corner(rx, ry, 180)

  const faces = pts.map(([x1, y1], i) => {
    const [x2, y2] = pts[(i + 1) % pts.length]
    const len = Math.hypot(x2 - x1, y2 - y1)
    if (len < 0.5) return null
    // Outward normal of a clockwise outline (y points down)
    const nx = (y2 - y1) / len
    const ny = -(x2 - x1) / len
    const lit = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1])
    const style = {
      ...edgeStrip((x1 + x2) / 2, (y1 + y2) / 2, len + 0.8, d, -d / 2, (Math.atan2(nx, -ny) * 180) / Math.PI),
      // Lightness of the metal at this face; .phone-band turns it into the band's colours
      '--lit': (19 + 14 * lit).toFixed(1),
    } as CSSProperties
    return <span key={i} className="phone-band backface-hidden absolute" style={style} />
  })

  // Buttons sit on the band, a little proud of it: [side, top, length] as fractions of the height
  const proud = Math.max(1, w * 0.006)
  const buttons: [side: 'left' | 'right', top: number, len: number, flush?: boolean][] = [
    ['left', 0.165, 0.04],
    ['left', 0.235, 0.075],
    ['left', 0.325, 0.075],
    ['right', 0.25, 0.115],
    ['right', 0.53, 0.065, true], // camera control: flush sapphire
  ]

  return (
    <>
      <span aria-hidden className="phone-cast absolute inset-0 rounded-[17%/7.9%]" style={{ transform: `translateZ(${-d - 70}px) translate(6%, 8%) scale(0.97)`, filter: `blur(${Math.round(w * 0.07)}px)` }} />
      <span aria-hidden className="phone-back absolute inset-0 rounded-[17%/7.9%]" style={{ transform: `translateZ(${-d}px)` }} />
      {faces}
      {buttons.map(([side, top, len, flush]) => {
        const out = flush ? 0.4 : proud
        const style = edgeStrip(side === 'right' ? w + out : -out, h * (top + len / 2), h * len, d * 0.42, -d / 2, side === 'right' ? 90 : 270)
        return <span key={`${side}${top}`} className={cn(flush ? 'phone-key-flush' : 'phone-key', 'backface-hidden absolute rounded-full')} style={style} />
      })}
    </>
  )
}

/**
 * A current phone: thin even bezels, a small camera pill and a graphite band with real
 * thickness when turned in 3D, the action and volume buttons on its left, the side button
 * and camera control on its right. The screen is light in both modes, like a product shot.
 * Its parents need preserve-3d (and one of them a perspective) for the depth to show.
 */
export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  const [screen, scale] = useFitScale<HTMLDivElement>(SCREEN_W)
  const [body, size] = useBoxSize<HTMLDivElement>()
  return (
    <div ref={body} className={cn('phone-body preserve-3d relative rounded-[17%/7.9%] p-[1.1%]', className)}>
      <PhoneDepth w={size.w} h={size.h} />
      <div className="phone-bezel rounded-[16%/7.4%] p-[2.1%]">
        <div ref={screen} data-theme="light" className="relative aspect-[9/19.5] overflow-hidden rounded-[14.5%/6.7%] bg-bg text-ink">
          <div className="absolute left-0 top-0 origin-top-left" style={{ width: SCREEN_W, height: SCREEN_H, transform: `scale(${scale})` }}>
            <span aria-hidden className="phone-island absolute left-1/2 top-[9px] z-30 h-[19px] w-[64px] -translate-x-1/2 rounded-full" />
            {children}
          </div>
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

/** Step 1: the phone camera framing the table's QR card. */
export function ScanScreen() {
  return (
    <div data-theme="dark" className="absolute inset-0 bg-bg">
      <div className="absolute inset-x-0 top-[18%] flex justify-center">
        <div data-theme="light" className="w-[62%] -rotate-3 rounded-[10px] bg-surface p-3 text-center text-ink shadow-pop">
          <p className="font-display text-[11px] leading-tight">{RESTAURANT.name}</p>
          <p className="text-[9px] text-ink-muted">Table 4</p>
          <div className="mx-auto mt-2 w-fit">
            <QRCodeSVG value="https://qyou.app/t/4" size={92} fgColor="black" bgColor="white" level="M" title="QR code for Table 4" />
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
      <SectionTabs />
      <div className="grid grid-cols-2 gap-x-2.5 gap-y-3 px-3.5 pt-3">
        {ids.map((id, i) => <PhotoCard key={id} id={id} qty={qty[i]} />)}
        <PhotoCard id={4} qty={0} />
      </div>
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
