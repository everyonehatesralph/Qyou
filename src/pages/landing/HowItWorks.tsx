import type { ReactNode } from 'react'
import { FlatPhone, ReadyScreen, ReceiptScreen, SentScreen } from './PhoneScreens'

const MOMENTS: { screen: ReactNode; title: string; body: string }[] = [
  {
    screen: <SentScreen />,
    title: 'The order waits for your staff',
    body: 'Nothing reaches the kitchen until someone at the counter confirms it. An order that looks wrong can be rejected with one tap.',
  },
  {
    screen: <ReceiptScreen />,
    title: 'The guest keeps a receipt',
    body: 'Every item, its price and the total, on their phone straight away. They can save it as an image.',
  },
  {
    screen: <ReadyScreen />,
    title: 'Their phone rings when it’s ready',
    body: 'The order page follows each change and rings when the food is ready, so nobody has to shout names.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <h2 className="max-w-2xl text-[clamp(1.75rem,3vw,2.25rem)] font-bold leading-tight tracking-[-0.015em]">
          What happens after they tap “Place order”
        </h2>
        <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-muted">
          Guests scan the QR code on their table and the menu opens in the browser, already set to that table. Once they order:
        </p>
        <div className="mt-12 grid gap-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
          {MOMENTS.map(m => (
            <figure key={m.title}>
              <FlatPhone top className="mx-auto max-w-[260px]">{m.screen}</FlatPhone>
              <figcaption className="mx-auto mt-6 max-w-[320px]">
                <p className="text-lg font-bold leading-snug">{m.title}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{m.body}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
