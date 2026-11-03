import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { ChefHat } from 'lucide-react'
import { cn } from '../../components/ui'
import { OrderScreen, PhoneFrame, ReadyScreen, ScanScreen, SentScreen } from './PhoneScreens'

const STEPS = [
  { n: '01', title: 'Scan', body: 'Guests point their camera at the QR code on the table. Your menu opens in the browser, already set to that table.' },
  { n: '02', title: 'Order', body: 'They add items, pick dine in or take away, write notes for the kitchen and send the order themselves.' },
  { n: '03', title: 'Cook', body: 'The order lands on your dashboard and kitchen screen at once. Staff confirm it and start cooking.' },
  { n: '04', title: 'Get notified', body: 'The guest’s order page follows each step live and rings when the food is ready. No shouting names.' },
]

const SCREENS = [ScanScreen, OrderScreen, SentScreen, ReadyScreen]
const EASE = [0.22, 1, 0.36, 1] as const

/** The kitchen ticket that flies out of the phone at step 3. */
function KitchenTicket({ ready }: { ready: boolean }) {
  return (
    <div data-theme="dark" className="w-[196px] rounded-[14px] border-2 border-line bg-surface p-3.5 text-ink shadow-lift">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
          <ChefHat className="h-3.5 w-3.5" aria-hidden /> Kitchen
        </span>
        <motion.span
          key={ready ? 'ready' : 'new'}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', ready ? 'bg-status-ready-bg text-status-ready-text' : 'bg-status-progress-bg text-status-progress-text')}
        >
          {ready ? 'Ready' : 'New'}
        </motion.span>
      </div>
      <p className="mt-2 font-display text-[30px] leading-none">Table 4</p>
      <ul className="mt-2.5 space-y-1 border-t border-line pt-2.5 text-[13px]">
        <li><span className="text-ink-muted">2×</span> Caramel Macchiato</li>
        <li><span className="text-ink-muted">1×</span> Butter Croissant</li>
      </ul>
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
  const showKitchen = step >= 2

  return (
    <section id="how-it-works" ref={ref} className="relative scroll-mt-16 lg:h-[400vh] h-[340vh]">
      <div className="sticky top-0 flex h-[100dvh] items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
          {/* Steps */}
          <div className="pt-16 lg:pt-0">
            <p className="font-mono text-[11px] uppercase tracking-widest text-accent-text">How it works</p>
            <h2 className="mt-3 text-balance font-display text-[34px] leading-[0.98] tracking-[-0.035em] text-ink sm:text-[48px]">
              One order, start to finish.
            </h2>

            {/* Compact view for phones: current step only */}
            <div className="mt-5 lg:hidden">
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

            {/* Full list from 1024px with a progress rail */}
            <ol className="relative mt-10 hidden space-y-7 pl-8 lg:block">
              <span className="absolute bottom-1 left-[5px] top-1 w-0.5 rounded-full bg-line" aria-hidden />
              <motion.span style={{ scaleY: rail }} className="absolute bottom-1 left-[5px] top-1 w-0.5 origin-top rounded-full bg-accent" aria-hidden />
              {STEPS.map((s, i) => (
                <li key={s.n} className={cn('relative transition-opacity duration-300', i === step ? 'opacity-100' : 'opacity-45')}>
                  <span className={cn('absolute -left-8 top-1.5 h-3 w-3 rounded-full border-2 transition-colors duration-300', i <= step ? 'border-accent bg-accent' : 'border-line-strong bg-bg')} aria-hidden />
                  <p className="font-display text-2xl text-ink"><span className="mr-3 font-mono text-sm text-ink-muted">{s.n}</span>{s.title}</p>
                  <p className="mt-1.5 max-w-md text-[15px] leading-relaxed text-ink-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Stage */}
          <div className="relative flex h-[min(54dvh,560px)] items-center justify-center [perspective:1400px] lg:h-[620px]">
            <motion.div
              animate={{ x: showKitchen ? -70 : 0 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="preserve-3d relative"
            >
              <motion.div
                style={{ rotateY, rotateX }}
                animate={step === 3 && !reduce ? { x: [0, -5, 5, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.5, repeat: step === 3 ? Infinity : 0, repeatDelay: 1.6 }}
                className="w-[min(50vw,200px)] sm:w-[240px] lg:w-[260px]"
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
            </motion.div>

            <AnimatePresence>
              {showKitchen && (
                <motion.div
                  key="kitchen"
                  initial={{ opacity: 0, x: -120, y: 60, rotate: -14, scale: 0.55 }}
                  animate={{ opacity: 1, x: 0, y: 0, rotate: 4, scale: 1 }}
                  exit={{ opacity: 0, x: -120, y: 60, rotate: -14, scale: 0.55 }}
                  transition={{ type: 'spring', stiffness: 160, damping: 18 }}
                  className="absolute bottom-[8%] right-0 z-10 sm:right-[2%] lg:bottom-auto lg:right-0 lg:top-[30%]"
                >
                  <KitchenTicket ready={step === 3} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
