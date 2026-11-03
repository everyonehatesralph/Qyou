import { useState } from 'react'
import { BellRing, ChevronDown, ShoppingBag, ShoppingCart, UtensilsCrossed } from 'lucide-react'
import { BottomSheet, Segmented } from './ui'
import { RESTAURANT } from '../config/restaurant'

const STEPS = [
  {
    icon: UtensilsCrossed,
    title: 'Browse the menu',
    desc: 'Search or tap a category. Tap + to add an item; sold-out items are grayed out.',
  },
  {
    icon: ShoppingCart,
    title: 'Check your cart',
    desc: 'Change quantities, then tap Checkout.',
  },
  {
    icon: ShoppingBag,
    title: 'Place your order',
    desc: 'Choose dine in or take away, add any extras or notes, and tap Place order.',
  },
  {
    icon: BellRing,
    title: 'Track it',
    desc: 'Your order page updates live as staff confirm and prepare it, and rings when it is ready.',
  },
]

const FAQS = [
  {
    q: 'Can I add more items after ordering?',
    a: 'Yes. Add them from the menu and place another order. Each order is tracked separately under Orders.',
  },
  {
    q: 'How do I know when my order is ready?',
    a: 'Keep your order page open. The status changes to "Ready for you" and your phone rings.',
  },
  {
    q: 'Can I cancel my order?',
    a: 'While it is waiting for confirmation or confirmed, cancel it from Orders. Once the kitchen starts preparing it, please ask a staff member.',
  },
  {
    q: 'What if the page stops working?',
    a: 'Refresh the page, or scan the QR code on your table again.',
  },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function HelpAssistant({ open, onClose }: Props) {
  const [tab, setTab] = useState<'guide' | 'faq'>('guide')

  return (
    <BottomSheet open={open} onClose={onClose} title="How can we help?" description={`Ordering at ${RESTAURANT.name}`}>
      <Segmented
        label="Help topics"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'guide', label: 'How to order' },
          { value: 'faq', label: 'Questions' },
        ]}
        className="mb-5"
      />

      {tab === 'guide' ? (
        <ol className="space-y-5">
          {STEPS.map((step, idx) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
                <step.icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 pt-0.5">
                <h3 className="text-[15px] font-medium text-ink">
                  <span className="text-ink-muted">{idx + 1}. </span>
                  {step.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="divide-y divide-line border-y border-line">
          {FAQS.map(faq => (
            <details key={faq.q} className="group">
              <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 py-3 text-[15px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                {faq.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180" aria-hidden />
              </summary>
              <p className="pb-4 pr-7 text-sm leading-relaxed text-ink-muted">{faq.a}</p>
            </details>
          ))}
        </div>
      )}
    </BottomSheet>
  )
}
