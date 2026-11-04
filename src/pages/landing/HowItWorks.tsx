import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { ChefHat } from 'lucide-react'
import { cn } from '../../components/ui'
import { RESTAURANT } from '../../config/restaurant'
import { MENU_ITEMS } from '../../constants/menu'
import { peso } from '../../utils/formatters'
import { OrderScreen, PhoneFrame, ReadyScreen, ScanScreen, SentScreen } from './PhoneScreens'

const STEPS = [
  { n: '01', title: 'Scan', body: 'Guests point their camera at the QR code on the table. Your menu opens in the browser, already set to that table.' },
  { n: '02', title: 'Order', body: 'They add items, pick dine in or take away, write notes for the kitchen and send the order themselves.' },
  { n: '03', title: 'Cook', body: 'The order lands on your dashboard and kitchen screen at once. Staff confirm it and start cooking.' },
  { n: '04', title: 'Get notified', body: 'The guest’s order page follows each step live and rings when the food is ready. No shouting names.' },
]

const SCREENS = [ScanScreen, OrderScreen, SentScreen, ReadyScreen]
const EASE = [0.22, 1, 0.36, 1] as const

// The order from the phone's order screen: 2× Caramel Macchiato, 1× Butter Croissant
const LINES = [{ id: 2, qty: 2 }, { id: 7, qty: 1 }].map(l => ({ ...l, item: MENU_ITEMS.find(i => i.id === l.id)! }))
const TOTAL = LINES.reduce((s, l) => s + l.item.price * l.qty, 0)

// Thermal printers feed paper in short bursts: eight eased steps over the run
const FEED_STEPS = 8
const feed = (t: number) => {
  const i = Math.min(FEED_STEPS - 1, Math.floor(t * FEED_STEPS))
  const f = t * FEED_STEPS - i
  return (i + f * f * (3 - 2 * f)) / FEED_STEPS
}
const FEED_DELAY = 0.3
const FEED_DURATION = 1.6

/** The kitchen printer: a dark device like the phone, with a status light and a paper slot. */
function Printer() {
  return (
    <div data-theme="dark" className="relative z-10 flex h-9 items-center justify-between rounded-[12px] border border-line-strong bg-surface px-3 text-ink shadow-lift">
      <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-ink-muted">
        <ChefHat className="h-3.5 w-3.5" aria-hidden /> Kitchen
      </span>
      {/* Blinks while it prints */}
      <motion.span
        className="h-1.5 w-1.5 rounded-full bg-status-ready-text"
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.3, 1, 0.3, 1, 0.3, 1, 0.3, 1] }}
        transition={{ delay: FEED_DELAY, duration: FEED_DURATION }}
      />
      <span className="absolute inset-x-2 -bottom-[3px] h-1.5 rounded-full bg-bg" />
    </div>
  )
}

/** The printed kitchen receipt: light paper in both modes, torn edge at the bottom. */
function Receipt({ ready }: { ready: boolean }) {
  return (
    <div data-theme="light" className="receipt-edge bg-surface px-2.5 pb-5 pt-3 text-ink sm:px-3">
      <p className="text-center font-mono text-[9px] uppercase tracking-widest text-ink-muted">{RESTAURANT.shortName}</p>
      <p className="mt-1 text-center font-display text-[22px] leading-none sm:text-[26px]">Table 4</p>
      <p className="mt-1 text-center font-mono text-[9px] text-ink-muted">Nº 0427 · Dine in</p>
      <div className="perforation my-2.5" />
      <ul className="space-y-1 text-[10px] leading-snug sm:text-[11px]">
        {LINES.map(l => (
          <li key={l.id} className="flex justify-between gap-2">
            <span><span className="text-ink-muted">{l.qty}×</span> {l.item.name}</span>
            <span className="tabular-nums">{peso(l.item.price * l.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="perforation my-2.5" />
      <p className="flex justify-between text-[11px] font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{peso(TOTAL)}</span>
      </p>
      <div className="mt-2.5 flex h-7 items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {ready ? (
            <motion.span
              key="ready"
              initial={{ opacity: 0, scale: 1.6, rotate: -16 }}
              animate={{ opacity: 1, scale: 1, rotate: -8 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              className="rounded-[6px] border-2 border-status-ready-text px-2 py-0.5 font-display text-[13px] uppercase leading-none tracking-wide text-status-ready-text"
            >
              Ready
            </motion.span>
          ) : (
            <motion.span
              key="sent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="font-mono text-[9px] uppercase tracking-widest text-ink-muted"
            >
              Sent to kitchen
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/** Printer plus the receipt feeding down out of its slot. */
function KitchenPrinter({ ready }: { ready: boolean }) {
  return (
    <div aria-hidden>
      <Printer />
      {/* Clip only the top, so paper appears from the slot and its shadow stays whole */}
      <div className="mx-2 -mt-[3px] [clip-path:inset(0_-2rem_-3rem_-2rem)]">
        <motion.div
          initial={{ y: '-100%' }}
          animate={{ y: 0 }}
          transition={{ delay: FEED_DELAY, duration: FEED_DURATION, ease: feed }}
        >
          {/* Paper settles with a small swing once it is out */}
          <motion.div
            className="paper-shadow origin-top"
            animate={{ rotate: [0, 1.6, -0.9, 0.4, 0] }}
            transition={{ delay: FEED_DELAY + FEED_DURATION, duration: 0.9, ease: 'easeOut' }}
          >
            <Receipt ready={ready} />
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default function HowItWorks() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const [step, setStep] = useState(0)

  useEffect(() => scrollYProgress.on('change', p => setStep(Math.min(STEPS.length - 1, Math.max(0, Math.floor(p * STEPS.length))))), [scrollYProgress])

  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 24 })
  const rotateY = useTransform(smooth, [0, 1], reduce ? [0, 0] : [-16, 14])
  const rotateX = useTransform(smooth, [0, 0.5, 1], reduce ? [0, 0, 0] : [6, 2, 6])
  const rail = useTransform(scrollYProgress, [0, 1], [0, 1])
  const Screen = SCREENS[step]
  // The receipt prints once the order is sent and stays for the rest of the story
  const printed = step >= 2

  return (
    // Pinned while the story plays. Short screens (phones turned sideways) get a plain list:
    // a pinned panel taller than the screen would cut the heading off.
    <section id="how-it-works" ref={ref} className="relative h-[340vh] lg:h-[400vh] short:!h-auto">
      {/* safe center: when the panel is taller than a small phone, it starts at the top instead of losing the heading */}
      <div className="sticky top-0 flex h-[100dvh] items-center overflow-hidden [align-items:safe_center] short:!static short:!h-auto short:py-12">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
          {/* Steps */}
          <div className="pt-16 lg:pt-0">
            <p className="font-mono text-xs uppercase tracking-widest text-accent-text">How it works</p>
            <h2 className="mt-3 text-balance font-display text-[34px] leading-[0.98] tracking-[-0.035em] text-ink sm:text-[48px]">
              One order, start to finish.
            </h2>

            {/* Compact view for phones: current step only. Screen readers get the full list below. */}
            <div className="mt-5 lg:hidden short:hidden" aria-hidden>
              <div className="flex gap-1.5" aria-hidden>
                {STEPS.map((s, i) => (
                  <span key={s.n} className={cn('h-1 flex-1 rounded-full transition-colors duration-300', i <= step ? 'bg-accent' : 'bg-line-strong')} />
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="mt-4">
                  <p className="font-display text-xl text-ink"><span className="mr-2 font-mono text-sm text-ink-muted">{STEPS[step].n}</span>{STEPS[step].title}</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">{STEPS[step].body}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Full list with a progress rail from 1024px; a plain list on short screens; always read by screen
                readers. not-sr-only zeroes padding and margin, so the rail's room (pl-8) is set again in each variant. */}
            <ol className="sr-only space-y-7 lg:not-sr-only lg:relative lg:mt-10 lg:pl-8 short:not-sr-only short:relative short:mt-6 short:space-y-5 short:pl-8">
              <span className="absolute bottom-1 left-[5px] top-1 w-0.5 rounded-full bg-line short:hidden" aria-hidden />
              <motion.span style={{ scaleY: rail }} className="absolute bottom-1 left-[5px] top-1 w-0.5 origin-top rounded-full bg-accent short:hidden" aria-hidden />
              {STEPS.map((s, i) => (
                <li key={s.n} className="relative">
                  <span className={cn('absolute -left-8 top-1.5 h-3 w-3 rounded-full border-2 transition-colors duration-300 short:border-accent short:bg-accent', i <= step ? 'border-accent bg-accent' : 'border-line-strong bg-bg')} aria-hidden />
                  {/* Inactive steps use muted text (still AA) rather than fading out */}
                  <p className={cn('font-display text-2xl transition-colors duration-300 short:text-ink', i === step ? 'text-ink' : 'text-ink-muted')}><span className="mr-3 font-mono text-sm text-ink-muted">{s.n}</span>{s.title}</p>
                  <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-ink-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Stage: an illustration of the steps described beside it */}
          {/* On phones the phone sits at the top of its space; a small screen crops its bottom, never the text */}
          <div className="relative flex h-[min(54dvh,560px)] items-start justify-center [perspective:1400px] lg:h-[620px] lg:items-center short:!hidden" aria-hidden>
            {/* The phone steps aside for the printer, further on phones so they never overlap */}
            <div
              className={cn(
                'preserve-3d relative transition-transform duration-700',
                printed && '-translate-x-[84px] sm:-translate-x-[80px] lg:-translate-x-[90px]',
              )}
            >
              <motion.div
                style={{ rotateY, rotateX }}
                animate={step === 3 && !reduce ? { x: [0, -5, 5, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.5, repeat: step === 3 ? Infinity : 0, repeatDelay: 1.6 }}
                className="preserve-3d w-[min(52vw,208px)] sm:w-[240px] lg:w-[260px]"
              >
                <PhoneFrame>
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      transition={{ duration: 0.45, ease: EASE }}
                      className="absolute inset-0"
                    >
                      <Screen />
                    </motion.div>
                  </AnimatePresence>
                </PhoneFrame>
              </motion.div>
            </div>

            <AnimatePresence>
              {printed && (
                <motion.div
                  key="printer"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="absolute right-0 top-[4%] z-10 w-[148px] sm:right-[4%] sm:w-[176px] lg:right-0 lg:top-[14%] lg:w-[200px]"
                >
                  <KitchenPrinter ready={step === 3} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
