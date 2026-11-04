import { useLayoutEffect, useRef, useState } from 'react'

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
