import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import SectionHeading from './SectionHeading'
import { Reveal } from './motion'

const FAQS = [
  {
    q: 'Do guests need to download an app?',
    a: 'No. Guests scan the QR code with their phone camera and the menu opens in their browser. Nothing to install, no account to create.',
  },
  {
    q: 'Which phones does it work on?',
    a: 'Any phone with a web browser, iPhone or Android. The same goes for the staff screens on phones, tablets and laptops.',
  },
  {
    q: 'What does the restaurant need to start?',
    a: 'A phone or tablet for your staff to see orders, and Wi-Fi. Table QR codes print straight from the staff screen.',
  },
  {
    q: 'Can guests order take-away?',
    a: 'Yes. Guests choose dine in or take away at checkout. Take-away orders get a short pickup code to show at the counter.',
  },
  {
    q: 'How can I try it?',
    a: 'Open the live demo from the top of this page. It is the same menu, cart and order tracking your guests would use.',
  },
]

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className="border-b border-line">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(o => !o)}
          className="flex min-h-[64px] w-full items-center justify-between gap-4 py-4 text-left text-[17px] font-semibold text-ink"
        >
          {q}
          <motion.span
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line-strong"
            aria-hidden
          >
            <Plus className="h-4 w-4" />
          </motion.span>
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-5 pr-12 text-[15px] leading-relaxed text-ink-muted">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Faq() {
  return (
    <section id="faq">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-28">
        <Reveal>
          <SectionHeading eyebrow="FAQ" title="Questions owners ask us." />
        </Reveal>
        <Reveal delay={0.1} className="border-t border-line">
          {FAQS.map(item => <Item key={item.q} {...item} />)}
        </Reveal>
      </div>
    </section>
  )
}
