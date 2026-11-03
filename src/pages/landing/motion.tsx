import { useLayoutEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { cn } from '../../components/ui'

const SPRING = { stiffness: 220, damping: 22, mass: 0.6 }

/** Card that tilts toward the pointer in 3D (off for touch and reduced motion). */
export function TiltCard({ children, className, max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-max, max]), SPRING)
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [max, -max]), SPRING)

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== 'mouse' || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width - 0.5)
    py.set((e.clientY - r.top) / r.height - 0.5)
  }
  const reset = () => { px.set(0); py.set(0) }

  return (
    <div className="[perspective:900px]">
      <motion.div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={reset}
        style={{ rotateX, rotateY }}
        className={cn('preserve-3d will-change-transform', className)}
      >
        {children}
      </motion.div>
    </div>
  )
}

/** Fades and lifts its content in the first time it scrolls into view. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** Endless ticker tape. The items render twice so the loop is seamless. */
export function Marquee({ items, className }: { items: string[]; className?: string }) {
  const row = (
    <div className="flex shrink-0 items-center" aria-hidden>
      {items.map(t => (
        <span key={t} className="flex items-center gap-6 px-6">
          {t}
          <span className="h-2 w-2 rotate-45 bg-accent" />
        </span>
      ))}
    </div>
  )
  return (
    <div className={cn('overflow-hidden', className)}>
      <p className="sr-only">{items.join('. ')}</p>
      <div className="flex w-max animate-marquee">
        {row}
        {row}
      </div>
    </div>
  )
}

/**
 * Scale factor that fits content drawn at `baseWidth` px into the measured element,
 * so a mock screen keeps its proportions at every size instead of reflowing.
 */
export function useFitScale<T extends HTMLElement>(baseWidth: number) {
  const ref = useRef<T>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setScale(el.clientWidth / baseWidth || 1)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [baseWidth])
  return [ref, scale] as const
}
