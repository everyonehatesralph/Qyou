import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'

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
    q: 'What if someone photographs the QR code and orders from home?',
    a: 'Every new order waits on the staff dashboard until someone confirms it, and nothing reaches the kitchen before that. An order for an empty table is easy to spot: reject it with one tap. Guests pay at the restaurant, so a fake order gets nobody anything.',
  },
  {
    q: 'What if a guest doesn’t have a phone?',
    a: 'They order the way they always have, with your staff. Or someone at their table adds it to their own order from their phone.',
  },
  {
    q: 'What if a guest isn’t comfortable ordering on a phone?',
    a: 'There is little to learn: scan, type a first name, tap the dishes, place the order. The Help button on the menu walks them through it step by step, and your staff can always take their order the usual way.',
  },
  {
    q: 'How do guests pay?',
    a: 'The way they do today, at the counter or the table. Staff see what is waiting to be paid on the dashboard and mark orders paid there, and guests keep a receipt of their order on their phone. Online payment isn’t part of Qyou yet.',
  },
  {
    q: 'Do guests get a receipt?',
    a: 'Yes, on their phone, as soon as they order: each item and its price, the total, the table and the time. Download receipt saves it to the phone as an image, and on phones that allow it, Share sends it to another app. It is an order receipt, not an official BIR receipt.',
  },
  {
    q: 'What if the internet goes down?',
    a: 'Guests need mobile data or your Wi-Fi to order. If your connection drops, the staff screens show Offline and catch up once it is back; until then, take orders the usual way.',
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
          className="flex min-h-[64px] w-full items-center justify-between gap-4 py-4 text-left text-[17px] font-medium text-ink"
        >
          {q}
          <motion.span
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-9 w-9 shrink-0 items-center justify-center text-ink-muted"
            aria-hidden
          >
            <Plus className="h-5 w-5" />
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
    <section id="faq" className="border-t border-line">
      <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 lg:py-28">
        <h2 className="text-[clamp(1.75rem,3vw,2.25rem)] font-bold leading-tight tracking-[-0.015em]">Questions owners ask</h2>
        <div className="mt-8 border-t border-line">
          {FAQS.map(item => <Item key={item.q} {...item} />)}
        </div>
      </div>
    </section>
  )
}
