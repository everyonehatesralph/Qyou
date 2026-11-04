import { Mail, MessageCircle, Phone } from 'lucide-react'
import { Ticket, buttonClasses } from '../../components/ui'
import { PRODUCT } from '../../config/product'
import { Reveal, TiltCard } from './motion'

/** 09468901590 → 0946 890 1590 */
function formatPhone(phone: string): string {
  return phone.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3')
}

export default function Contact() {
  const { phone, email, messenger } = PRODUCT.contact

  return (
    <section id="contact" className="px-2 py-4 sm:px-4">
      <div className="overflow-hidden rounded-[28px] bg-accent text-on-accent sm:rounded-[36px]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[1fr_auto] lg:py-24">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-widest">Book a demo</p>
            <h2 className="mt-3 font-display text-[clamp(2.75rem,9vw,5.5rem)] leading-[0.9] tracking-[-0.045em]">
              Your number’s up.
            </h2>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed">
              Call or text and we’ll walk you through the guest and staff screens, and answer your questions about getting set up.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="w-full max-w-[380px] justify-self-center lg:justify-self-end">
            <div className="rotate-2">
            <TiltCard max={9} className="drop-shadow-2xl">
              <Ticket
                bodyClassName="px-6 pb-6 pt-5"
                stubClassName="px-6 pb-6 pt-5"
                stub={
                  <div className="flex flex-wrap gap-2.5">
                    <a href={`tel:${phone}`} className={buttonClasses({ variant: 'primary', size: 'lg' }, 'flex-1')}>
                      <Phone />
                      Call now
                    </a>
                    {email && (
                      <a href={`mailto:${email}`} className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
                        <Mail />
                        Email
                      </a>
                    )}
                    {messenger && (
                      <a href={messenger} target="_blank" rel="noreferrer" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
                        <MessageCircle />
                        Messenger
                      </a>
                    )}
                  </div>
                }
              >
                <div className="flex items-center justify-between font-mono text-xs uppercase tracking-widest text-ink-muted">
                  <span>Call or text</span>
                  <span>Qyou</span>
                </div>
                <a href={`tel:${phone}`} className="mt-3 flex min-h-11 items-center font-display text-[clamp(2rem,8vw,2.6rem)] leading-none tracking-[-0.03em] text-ink tabular-nums hover:text-accent-text">
                  {formatPhone(phone)}
                </a>
              </Ticket>
            </TiltCard>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
