import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, Mail, MessageCircle, MessageSquare, Phone } from 'lucide-react'
import { buttonClasses } from '../../components/ui'
import { PRODUCT } from '../../config/product'

/** 09468901590 → 0946 890 1590 */
function formatPhone(phone: string): string {
  return phone.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3')
}

export default function Contact() {
  const { phone, email, messenger } = PRODUCT.contact
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])

  const copyNumber = () => {
    navigator.clipboard?.writeText(phone).then(() => setCopied(true)).catch(() => { /* no clipboard: the number is on screen */ })
  }

  // Email and Messenger appear once they're filled in (src/config/product.ts)
  const more = [
    email && { href: `mailto:${email}`, label: 'Email', icon: <Mail />, external: false },
    messenger && { href: messenger, label: 'Messenger', icon: <MessageCircle />, external: true },
  ].filter(Boolean) as { href: string; label: string; icon: ReactNode; external: boolean }[]

  return (
    <section id="contact" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-10 rounded-card bg-surface-2 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16 lg:p-14">
          <div className="max-w-xl">
            <h2 className="text-[clamp(1.75rem,3vw,2.25rem)] font-bold leading-tight tracking-[-0.015em]">Talk to us</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-ink-muted">
              Call or text, and we’ll show you Qyou on your phone. Then we’ll help you add your menu and tables and print your QR codes.
            </p>
            <Link
              to={PRODUCT.demoTablePath}
              className="mt-4 inline-flex min-h-11 items-center text-[15px] font-medium underline decoration-1 underline-offset-4 hover:text-accent-text"
            >
              Or try it as a guest first
            </Link>
          </div>

          <div>
            <a
              href={`tel:${phone}`}
              className="inline-flex min-h-11 items-center text-[clamp(2rem,4vw,2.75rem)] font-bold leading-none tracking-[-0.02em] tabular-nums hover:text-accent-text"
            >
              {formatPhone(phone)}
            </a>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <a href={`tel:${phone}`} className={buttonClasses({ variant: 'primary', size: 'lg' })}>
                <Phone />
                Call
              </a>
              <a href={`sms:${phone}`} className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
                <MessageSquare />
                Text
              </a>
              {more.map(m => (
                <a
                  key={m.label}
                  href={m.href}
                  {...(m.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                  className={buttonClasses({ variant: 'secondary', size: 'lg' })}
                >
                  {m.icon}
                  {m.label}
                </a>
              ))}
              <button type="button" onClick={copyNumber} className={buttonClasses({ variant: 'ghost', size: 'lg' })}>
                {copied ? <Check /> : <Copy />}
                <span aria-live="polite">{copied ? 'Copied' : 'Copy number'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
