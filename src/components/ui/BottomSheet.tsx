import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import IconButton from './IconButton'
import { cn } from './cn'
import { focusMain } from './focus'

export interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  /** Sticky area under the scrolling body, for the main action. */
  footer?: ReactNode
  className?: string
}

// Tab stops only: radio groups keep their unselected options at tabindex -1
const FOCUSABLE = ['a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]']
  .map(s => `${s}:not([tabindex="-1"])`)
  .join(',')
const WIDE = '(min-width: 768px)'
const EASE = [0.32, 0.72, 0, 1] as const

function useIsWide() {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches)
  useEffect(() => {
    const mq = window.matchMedia(WIDE)
    const update = () => setWide(mq.matches)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return wide
}

/** Bottom sheet below 768px, centered dialog from 768px. Escape and backdrop close it. */
export default function BottomSheet({ open, onClose, title, description, children, footer, className }: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const titleId = useId()
  const wide = useIsWide()
  // A body that scrolls but holds nothing focusable must take focus itself, or
  // keyboard users cannot scroll it (WCAG 2.1.1)
  const [bodyScrolls, setBodyScrolls] = useState(false)
  const [bodyEl, setBodyEl] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!bodyEl) return
    const check = () => setBodyScrolls(bodyEl.scrollHeight > bodyEl.clientHeight + 1 && !bodyEl.querySelector(FOCUSABLE))
    const ro = new ResizeObserver(check)
    ro.observe(bodyEl)
    Array.from(bodyEl.children).forEach(c => ro.observe(c))
    check()
    return () => ro.disconnect()
  }, [bodyEl])

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const raf = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? panelRef.current)?.focus()
    })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      // Back to what opened it; if that is gone (e.g. a cancelled order's button), the page heading
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
      else focusMain()
    }
  }, [open])

  const hidden = wide ? { opacity: 0, scale: 0.97, y: 8 } : { y: '100%' }
  const shown = wide ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-6">
          <motion.div
            className="absolute inset-0 bg-scrim"
            onClick={onClose}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col rounded-t-sheet bg-surface text-ink shadow-pop outline-none',
              // Short screens: the whole sheet scrolls, so the footer can't squeeze the content to a sliver
              'short:overflow-y-auto short:overscroll-contain',
              'md:max-h-[85vh] md:max-w-lg md:rounded-sheet',
              className,
            )}
            initial={hidden}
            animate={shown}
            exit={{ ...hidden, transition: { type: 'tween', ease: EASE, duration: wide ? 0.14 : 0.2 } }}
            transition={{ type: 'tween', ease: EASE, duration: wide ? 0.2 : 0.32 }}
          >
            <div className="flex justify-center pt-2.5 md:hidden" aria-hidden>
              <span className="h-1 w-9 rounded-full bg-line-strong" />
            </div>
            {(title || description) && (
              <div className="flex items-start gap-3 px-5 pb-3 pt-2 md:pt-5">
                <div className="min-w-0 flex-1 pt-1.5">
                  {title && <h2 id={titleId} className="font-display text-xl leading-snug text-ink">{title}</h2>}
                  {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
                </div>
                <IconButton label="Close" onClick={onClose} className="-mr-2">
                  <X />
                </IconButton>
              </div>
            )}
            <div
              ref={setBodyEl}
              tabIndex={bodyScrolls ? 0 : undefined}
              role={bodyScrolls ? 'region' : undefined}
              aria-labelledby={bodyScrolls && title ? titleId : undefined}
              className={cn(
                'min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 short:flex-none short:overflow-visible',
                footer ? 'pb-4' : 'pb-[max(1.25rem,env(safe-area-inset-bottom))]',
              )}
            >
              {children}
            </div>
            {footer && (
              <div className="border-t border-line px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
