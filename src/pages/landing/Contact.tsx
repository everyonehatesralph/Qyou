import { Mail, MessageCircle, Phone } from 'lucide-react'
import { buttonClasses } from '../../components/ui'
import { PRODUCT } from '../../config/product'
import SectionHeading from './SectionHeading'

/** 09468901590 → 0946 890 1590 */
function formatPhone(phone: string): string {
  return phone.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3')
}

export default function Contact() {
  const { phone, email, messenger } = PRODUCT.contact

  return (
    <section id="contact" className="scroll-mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-24">
        <SectionHeading
          eyebrow="Book a demo"
          title="Talk to us about your tables"
          body="Call and we'll walk you through the guest and staff screens, and answer your questions about getting set up."
        />
        <div className="rounded-card border border-line bg-bg p-5 sm:p-8">
          <p className="text-sm font-medium text-ink-muted">Call or text</p>
          <a
            href={`tel:${phone}`}
            className="mt-2 block font-display text-[34px] leading-tight tracking-[-0.01em] text-ink tabular-nums hover:text-accent-text sm:text-[40px]"
          >
            {formatPhone(phone)}
          </a>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={`tel:${phone}`} className={buttonClasses({ variant: 'primary', size: 'lg' })}>
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
        </div>
      </div>
    </section>
  )
}
