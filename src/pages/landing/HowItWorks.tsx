import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { cn } from '../../components/ui'
import { OrderScreen, PhoneFrame, ReadyScreen, ReceiptScreen, ScanScreen, SentScreen } from './PhoneScreens'

const STEPS = [
  { n: '01', title: 'Scan', body: 'Guests point their camera at the QR code on the table. Your menu opens in the browser, already set to that table.' },
  { n: '02', title: 'Order', body: 'They add items, pick dine in or take away, write notes for the kitchen and send the order themselves.' },
  { n: '03', title: 'Receipt', body: 'The receipt is on their phone the moment they order: every item, its price and the total. Download receipt saves it to the phone as an image.' },
  { n: '04', title: 'Cook', body: 'The order lands on your dashboard and kitchen screen at once. Staff confirm it and start cooking.' },
  { n: '05', title: 'Get notified', body: 'The guest’s order page follows each step live and rings when the food is ready. No shouting names.' },
]

const SCREENS = [ScanScreen, OrderScreen, ReceiptScreen, SentScreen, ReadyScreen]
const LAST = STEPS.length - 1
const EASE = [0.22, 1, 0.36, 1] as const

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

  return (
    // Pinned while the story plays, about 85vh of scrolling per step. Short screens (phones turned
    // sideways) get a plain list: a pinned panel taller than the screen would cut the heading off.
    <section id="how-it-works" ref={ref} className="relative h-[420vh] lg:h-[500vh] short:!h-auto">
      {/* safe center: when the panel is taller than a small phone, it starts at the top instead of losing the heading */}
      <div className="sticky top-0 flex h-[100dvh] items-center overflow-hidden [align-items:safe_center] short:!static short:!h-auto short:py-12">
        {/* From 1024px the phone sits on the left and the steps on the right (the hero is the other way round) */}
        <div className="mx-auto grid w-full max-w-6xl items-center gap-6 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
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
            <ol className="sr-only space-y-6 lg:not-sr-only lg:relative lg:mt-9 lg:pl-8 short:not-sr-only short:relative short:mt-6 short:space-y-5 short:pl-8">
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
          <div className="relative flex h-[min(54dvh,560px)] items-start justify-center [perspective:1400px] lg:order-first lg:h-[620px] lg:items-center short:!hidden" aria-hidden>
            <div className="preserve-3d relative">
              <motion.div
                style={{ rotateY, rotateX }}
                animate={step === LAST && !reduce ? { x: [0, -5, 5, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.5, repeat: step === LAST ? Infinity : 0, repeatDelay: 1.6 }}
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
          </div>
        </div>
      </div>
    </section>
  )
}
