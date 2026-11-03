import { BellRing, QrCode, ShoppingBag } from 'lucide-react'
import SectionHeading from './SectionHeading'

const STEPS = [
  {
    icon: QrCode,
    title: 'Scan',
    body: 'Guests point their phone camera at the QR code on the table. Your menu opens in the browser, already set to that table.',
  },
  {
    icon: ShoppingBag,
    title: 'Order',
    body: 'They browse, add items with notes, choose dine in or take away, and send the order themselves.',
  },
  {
    icon: BellRing,
    title: 'Get notified',
    body: 'The order page follows each step live, and rings when the food is ready. Take-away orders get a pickup code.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <SectionHeading
          eyebrow="How it works"
          title="From table to kitchen without the counter"
          body="Guests order at their own pace, and your staff spend their time making and serving instead of taking orders."
        />
        <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, i) => (
            <li key={step.title} className="border-t border-line-strong pt-6">
              <div className="flex items-center justify-between">
                <span className="font-display text-[40px] leading-none text-ink">{i + 1}</span>
                <step.icon className="h-6 w-6 text-ink-muted" aria-hidden />
              </div>
              <h3 className="mt-5 font-display text-2xl text-ink">{step.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
