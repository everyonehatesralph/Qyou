import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowRight, BellRing } from 'lucide-react'
import { Ticket, buttonClasses, cn } from '../../components/ui'
import { PRODUCT } from '../../config/product'
import { RESTAURANT } from '../../config/restaurant'
import { MenuScreen, PhoneFrame } from './PhoneScreens'
import { Marquee } from './motion'

const EASE = [0.22, 1, 0.36, 1] as const
const SPRING = { stiffness: 120, damping: 20, mass: 0.8 }

/** A headline line that slides up from behind a mask. */
function Line({ children, delay, className }: { children: ReactNode; delay: number; className?: string }) {
  const [landed, setLanded] = useState(false)
  return (
    // Clip only the bottom edge, and only while the line rises, so the tilted
    // ticket and its shadow are never cut
    <span className={cn('block pb-[0.06em]', !landed && '[clip-path:inset(-1em_-1em_0_-1em)]', className)}>
      <motion.span
        className="block"
        initial={{ y: '115%' }}
        animate={{ y: 0 }}
        transition={{ duration: 0.9, delay, ease: EASE }}
        onAnimationComplete={() => setLanded(true)}
      >
        {children}
      </motion.span>
    </span>
  )
}

/** Phone, "now serving" ticket, table card and ready notice, layered in 3D. */
function Scene({ px, py, scroll }: { px: MotionValue<number>; py: MotionValue<number>; scroll: MotionValue<number> }) {
  const reduce = useReducedMotion()
  const tiltY = useSpring(useTransform(px, [-0.5, 0.5], [-10, 10]), SPRING)
  const tiltX = useSpring(useTransform(py, [-0.5, 0.5], [8, -8]), SPRING)
  // Scrolling away turns the phone to face you and lifts the scene
  const turn = useTransform(scroll, [0, 1], [-18, 6])
  const lift = useTransform(scroll, [0, 1], [0, -90])
  const rotateY = useTransform([tiltY, turn], ([a, b]: number[]) => (reduce ? -12 : a + b))
  const rotateX = useTransform([tiltX, scroll], ([a, s]: number[]) => (reduce ? 6 : 6 + a + s * 8))

  return (
    // A picture of the product; the headline and copy beside it say the same in words
    // On phones the scene is as tall as its phone (52% of the screen, like the one in How it works)
    // The scene fades in here, not on the phone: a fading element is drawn flat, which
    // would hide the phone's depth until the fade ends
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
      className="relative mx-auto h-[calc(min(52vw,208px)*2.3+32px)] w-full max-w-[460px] [perspective:1600px] sm:h-[600px]"
      aria-hidden
    >
      <motion.div style={{ rotateY, rotateX, y: reduce ? 0 : lift }} className="preserve-3d absolute inset-0">
        {/* Back: now-serving ticket */}
        <motion.div
          initial={{ opacity: 0, rotate: 14, y: 40 }}
          animate={{ opacity: 1, rotate: 9, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: EASE }}
          className="absolute right-0 top-6 w-[148px] drop-shadow-xl sm:-right-6 sm:w-[200px]"
          style={{ z: -140 }}
        >
          <Ticket
            tone="accent"
            bodyClassName="px-4 pb-4 pt-3.5"
            stubClassName="px-4 py-3"
            stub={<p className="font-mono text-[10px] uppercase tracking-widest">Table 4 · {RESTAURANT.shortName}</p>}
          >
            <p className="font-mono text-[10px] uppercase tracking-widest">Now serving</p>
            <p className="font-display text-[52px] leading-[0.9] tracking-[-0.04em] sm:text-[64px]">042</p>
          </Ticket>
        </motion.div>

        {/* Middle: the phone */}
        <motion.div
          initial={{ y: 60 }}
          animate={{ y: 0 }}
          transition={{ duration: 1.1, delay: 0.25, ease: EASE }}
          className="preserve-3d absolute left-1/2 top-0 w-[min(52vw,208px)] sm:w-[272px]"
          style={{ x: '-50%' }}
        >
          <PhoneFrame>
            <MenuScreen />
          </PhoneFrame>
        </motion.div>

        {/* Front: table tent card */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.9, ease: EASE }}
          className="absolute bottom-6 left-0 w-[120px] sm:-left-4 sm:w-[132px]"
          style={{ z: 90, rotate: -6 }}
        >
          <div data-theme="light" className="rounded-[14px] bg-surface p-3 text-center text-ink shadow-lift">
            <p className="font-display text-[11px] leading-tight">{RESTAURANT.shortName}</p>
            <div className="mx-auto mt-2 w-fit">
              <QRCodeSVG value="https://qyou.app/t/4" size={84} fgColor="black" bgColor="white" level="M" title="QR code for Table 4" />
            </div>
            <p className="mt-2 text-[10px] font-semibold">Scan to order<span className="block">Table 4</span></p>
          </div>
        </motion.div>

        {/* Front: ready notification */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: [0, -8, 0], scale: 1 }}
          transition={{ opacity: { delay: 1.4, duration: 0.5 }, scale: { delay: 1.4, duration: 0.5 }, y: { delay: 1.9, duration: 4, repeat: Infinity, ease: 'easeInOut' } }}
          className="absolute -right-1 top-[56%] sm:-right-8 sm:top-[52%]"
          style={{ z: 140 }}
        >
          {/* Compact on phones so it sits beside the phone instead of over it */}
          <div data-theme="light" className="flex items-center gap-2.5 rounded-[16px] bg-surface p-2.5 text-ink shadow-lift sm:w-[214px] sm:gap-3 sm:p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-status-ready-bg text-status-ready-text sm:h-10 sm:w-10">
              <BellRing className="h-[18px] w-[18px] animate-ring sm:h-5 sm:w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[12px] font-semibold sm:text-[13px]">Your order is ready</span>
              <span className="block text-[12px] text-ink-muted">Table 4<span className="hidden sm:inline"> · Order Nº 0427</span></span>
            </span>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export default function Hero() {
  const ref = useRef<HTMLElement>(null)
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse' || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width - 0.5)
    py.set((e.clientY - r.top) / r.height - 0.5)
  }

  return (
    <section ref={ref} onPointerMove={onMove} className="relative overflow-x-clip">
      <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 pb-14 pt-10 sm:px-6 md:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-4 lg:pb-20">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-ink-muted"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            QR table ordering
          </motion.p>

          <h1 className="mt-6 font-display text-[clamp(3.1rem,11vw,5.6rem)] leading-[0.92] tracking-[-0.045em] text-ink">
            <Line delay={0.1}>Don't queue.</Line>
            {/* A little air so the ticket clears the descenders above */}
            <Line delay={0.22} className="mt-[0.05em]">
              Just{' '}
              {/* The queue ticket stamps down once its line is in */}
              <span className="hero-ticket-lift inline-block">
                <motion.span
                  className="ticket hero-ticket relative inline-block rounded-[0.1em] bg-accent px-[0.24em] pb-[0.1em] pt-[0.08em] text-on-accent [--notch:0.11em]"
                  initial={{ rotate: 0, scale: 1 }}
                  animate={{ rotate: -2.5, scale: [1, 1.08, 1] }}
                  transition={{ delay: 0.85, duration: 0.55, ease: EASE }}
                >
                  Qyou.
                </motion.span>
              </span>
            </Line>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease: EASE }}
            className="mt-7 max-w-[34rem] text-lg leading-relaxed text-ink-muted"
          >
            Guests scan the code on their table, order from their own phone and get notified when it's ready.
            Your team sees every order the moment it's placed. No app to download, no line at the counter.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55, ease: EASE }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Link to={PRODUCT.demoTablePath} className={buttonClasses({ variant: 'primary', size: 'lg' }, 'group')}>
              Try the live demo
              <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <a href="#contact" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
              Book a demo
            </a>
          </motion.div>
          <p className="mt-4 text-sm text-ink-muted">The demo opens Table 1 at {RESTAURANT.name}.</p>
        </div>

        <Scene px={px} py={py} scroll={scrollYProgress} />
      </div>

      {/* Ticket tape */}
      <div className="relative -mx-4 -rotate-[1.5deg] py-2">
        <Marquee
          className="bg-ink py-3.5 font-mono text-[13px] uppercase tracking-[0.14em] text-bg"
          items={['No queue at the counter', 'No app to download', 'Order from the table', 'Get notified when it’s ready', 'Kitchen screen included', 'Printable table QR codes']}
        />
      </div>
    </section>
  )
}
