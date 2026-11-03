import { ChevronDown } from 'lucide-react'
import SectionHeading from './SectionHeading'

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

export default function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-24">
        <SectionHeading eyebrow="FAQ" title="Questions owners ask us" />
        <div className="divide-y divide-line border-y border-line">
          {FAQS.map(item => (
            <details key={item.q} className="group">
              <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-[17px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="h-5 w-5 shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180" aria-hidden />
              </summary>
              <p className="pb-5 pr-9 text-[15px] leading-relaxed text-ink-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
