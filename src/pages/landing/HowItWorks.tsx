import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { ChefHat } from 'lucide-react'
import { cn } from '../../components/ui'
import { RESTAURANT } from '../../config/restaurant'
import { MENU_ITEMS } from '../../constants/menu'
import { peso } from '../../utils/formatters'
import { FEED_DELAY, FEED_DURATION, OrderScreen, PhoneFrame, ReadyScreen, ReceiptScreen, ScanScreen, SentScreen, feed } from './PhoneScreens'

// Two lines each at the column's width, so the list keeps its height as steps open and close
const STEPS = [
  { n: '01', title: 'Scan', body: 'Guests scan the QR code on their table. Your menu opens in the browser, already set to that table.' },
  { n: '02', title: 'Order', body: 'They pick items, dine in or take away, add notes for the kitchen and send the order themselves.' },
  { n: '03', title: 'Receipt', body: 'Their receipt shows up on their phone the moment they order. One tap saves it as an image.' },
  { n: '04', title: 'Cook', body: 'The order lands on your dashboard and kitchen screen at once. Staff confirm it and start cooking.' },
  { n: '05', title: 'Get notified', body: 'Their order page follows each step live and rings when the food is ready. No shouting names.' },
]

const SCREENS = [ScanScreen, OrderScreen, ReceiptScreen, SentScreen, ReadyScreen]
const COOK = 3
const LAST = STEPS.length - 1
const EASE = [0.22, 1, 0.36, 1] as const

// The order from the phone's order screen: 2× Caramel Macchiato, 1× Butter Croissant
const LINES = [{ id: 2, qty: 2 }, { id: 7, qty: 1 }].map(l => ({ ...l, item: MENU_ITEMS.find(i => i.id === l.id)! }))
const TOTAL = LINES.reduce((s, l) => s + l.item.price * l.qty, 0)

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

/** The kitchen's ticket: light paper in both modes, torn edge at the bottom, stamped Ready at the end. */
function KitchenTicket({ ready }: { ready: boolean }) {
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

/** Printer plus the ticket feeding down out of its slot. */
function KitchenPrinter({ ready }: { ready: boolean }) {
  return (
    <div aria-hidden>
      <Printer />
      {/* Clip only the top, so paper appears from the slot and its shadow stays whole */}
      <div className="mx-2 -mt-[3px] [clip-path:inset(0_-2rem_-3rem_-2rem)]">
        <motion.div initial={{ y: '-100%' }} animate={{ y: 0 }} transition={{ delay: FEED_DELAY, duration: FEED_DURATION, ease: feed }}>
          {/* Paper settles with a small swing once it is out */}
          <motion.div
            className="paper-shadow origin-top"
            animate={{ rotate: [0, 1.6, -0.9, 0.4, 0] }}
            transition={{ delay: FEED_DELAY + FEED_DURATION, duration: 0.9, ease: 'easeOut' }}
          >
            <KitchenTicket ready={ready} />
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

  useEffect(() => scrollYProgress.on('change', p => setStep(Math.min(LAST, Math.max(0, Math.floor(p * STEPS.length))))), [scrollYProgress])

  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 24 })
  const rotateY = useTransform(smooth, [0, 1], reduce ? [0, 0] : [-16, 14])
  const rotateX = useTransform(smooth, [0, 0.5, 1], reduce ? [0, 0, 0] : [6, 2, 6])
  const rail = useTransform(scrollYProgress, [0, 1], [0, 1])
  const Screen = SCREENS[step]
  // From 04 Cook the order prints in the kitchen, and the ticket stays for the rest of the story
  const printed = step >= COOK

  return (
    // Pinned while the story plays, about 85vh of scrolling per step. Short screens (phones turned
    // sideways) get a plain list: a pinned panel taller than the screen would cut the heading off.
    <section id="how-it-works" ref={ref} className="relative h-[420vh] lg:h-[500vh] short:!h-auto">
      {/* safe center: when the panel is taller than a small phone, it starts at the top instead of losing the heading */}
      <div className="sticky top-0 flex h-[100dvh] items-center overflow-hidden [align-items:safe_center] short:!static short:!h-auto short:py-12">
        {/* From 1024px the phone sits on the left and the steps on the right (the hero is the other way round).
            The phone's column is only as wide as the phone, and the pair is centred, so they read as one piece. */}
        <div className="mx-auto grid w-full max-w-6xl items-center gap-6 px-4 sm:px-6 lg:grid-cols-[340px_minmax(0,28rem)] lg:justify-center lg:gap-16 xl:grid-cols-[340px_minmax(0,30rem)] xl:gap-24">
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
                readers. not-sr-only zeroes padding and margin, so the rail's room (pl-8) is set again in each variant.
                From 1024px only the current step shows its description, so it reads with the phone beside it; the
                others fold away (still in the page for screen readers). Short screens show every description. */}
            <ol className="sr-only lg:not-sr-only lg:relative lg:mt-8 lg:pl-8 short:not-sr-only short:relative short:mt-6 short:space-y-3 short:pl-8">
              <span className="absolute bottom-3 left-[5px] top-3 w-0.5 rounded-full bg-line short:hidden" aria-hidden />
              <motion.span style={{ scaleY: rail }} className="absolute bottom-3 left-[5px] top-3 w-0.5 origin-top rounded-full bg-accent short:hidden" aria-hidden />
              {STEPS.map((s, i) => (
                <li key={s.n} data-current={i === step} className="group relative py-2.5 short:py-0">
                  <span
                    className={cn(
                      'absolute -left-8 top-[18px] h-3 w-3 rounded-full border-2 transition-[background-color,border-color,box-shadow] duration-300 short:top-1.5 short:border-accent short:bg-accent short:shadow-none',
                      i <= step ? 'border-accent bg-accent' : 'border-line-strong bg-bg',
                      // The current step's dot carries a soft halo
                      i === step && 'shadow-[0_0_0_5px_var(--accent-soft)]',
                    )}
                    aria-hidden
                  />
                  {/* Inactive steps use muted text (still AA) rather than fading out */}
                  <p className={cn('font-display text-2xl transition-colors duration-300 short:text-ink', i === step ? 'text-ink' : 'text-ink-muted')}>
                    <span className="mr-3 font-mono text-sm text-ink-muted">{s.n}</span>
                    {s.title}
                  </p>
                  {/* Opens and closes by animating the row height from 0fr to 1fr */}
                  <div className="grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:grid-rows-[0fr] lg:opacity-0 lg:group-data-[current=true]:grid-rows-[1fr] lg:group-data-[current=true]:opacity-100 short:!grid-rows-[1fr] short:!opacity-100">
                    <div className="min-h-0 overflow-hidden">
                      <p className="max-w-md pt-1.5 text-[15px] leading-relaxed text-ink-muted">{s.body}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Stage: an illustration of the steps described beside it */}
          {/* On phones the phone sits at the top of its space; a small screen crops its bottom, never the text */}
          <div className="relative flex h-[min(54dvh,560px)] items-start justify-center [perspective:1400px] lg:order-first lg:h-[620px] lg:items-center short:!hidden" aria-hidden>
            {/* The phone steps aside for the kitchen printer, further on phones so they never overlap */}
            <div
              className={cn(
                'preserve-3d relative transition-transform duration-700',
                printed && '-translate-x-[84px] sm:-translate-x-[80px] lg:-translate-x-[102px] xl:-translate-x-[116px]',
              )}
            >
              <motion.div
                style={{ rotateY, rotateX }}
                animate={step === LAST && !reduce ? { x: [0, -5, 5, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.5, repeat: step === LAST ? Infinity : 0, repeatDelay: 1.6 }}
                className="preserve-3d w-[min(52vw,208px)] sm:w-[240px] xl:w-[260px]"
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

            {/* From 1024px the printer reaches into the space between the phone and the steps */}
            <AnimatePresence>
              {printed && (
                <motion.div
                  key="printer"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.3, ease: EASE }}
                  className="absolute right-0 top-[4%] z-10 w-[140px] sm:right-[4%] sm:w-[176px] lg:-right-10 lg:top-[14%] lg:w-[168px] xl:-right-14 xl:w-[184px]"
                >
                  <KitchenPrinter ready={step === LAST} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
