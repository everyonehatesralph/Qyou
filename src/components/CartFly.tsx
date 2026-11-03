import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const EVENT = 'qyou:fly-to-cart'

interface Flight { id: number; x: number; y: number; tx: number; ty: number }

/** Sends a small dot from `from` to the cart tab. Call when an item is added. */
export function flyToCart(from: Element | null) {
  if (!from) return
  const r = from.getBoundingClientRect()
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 } }))
}

/** Renders the flying dots. Mount once inside the customer shell. */
export default function CartFlyLayer() {
  const reduce = useReducedMotion()
  const [flights, setFlights] = useState<Flight[]>([])

  useEffect(() => {
    let next = 0
    const onFly = (e: Event) => {
      if (reduce) return
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail
      const target = document.querySelector('[data-cart-target]')?.getBoundingClientRect()
      if (!target) return
      const flight = { id: next++, x, y, tx: target.left + target.width / 2, ty: target.top + target.height / 2 }
      setFlights(f => [...f, flight])
      setTimeout(() => setFlights(f => f.filter(g => g.id !== flight.id)), 700)
    }
    window.addEventListener(EVENT, onFly)
    return () => window.removeEventListener(EVENT, onFly)
  }, [reduce])

  return createPortal(
    <AnimatePresence>
      {flights.map(f => (
        <motion.span
          key={f.id}
          aria-hidden
          className="pointer-events-none fixed left-0 top-0 z-[70] h-3.5 w-3.5 rounded-full bg-accent"
          initial={{ x: f.x - 7, y: f.y - 7, scale: 1, opacity: 1 }}
          // Arc: rise a little, then fall into the cart
          animate={{
            x: [f.x - 7, (f.x + f.tx) / 2 - 7, f.tx - 7],
            y: [f.y - 7, Math.min(f.y, f.ty) - 80, f.ty - 7],
            scale: [1, 1.15, 0.5],
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        />
      ))}
    </AnimatePresence>,
    document.body,
  )
}
