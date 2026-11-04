import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Copy, Mail, MessageCircle, MessageSquare, Phone } from 'lucide-react'
import { Ticket, buttonClasses, cn } from '../../components/ui'
import { PRODUCT } from '../../config/product'
import { Reveal, TiltCard } from './motion'

/** 09468901590 → 0946 890 1590 */
function formatPhone(phone: string): string {
  return phone.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3')
}

const STEPS = [
  { title: 'Call or text', body: 'Tell us about your café and how busy your counter gets.' },
  { title: 'See it live', body: 'On your phone, we walk you through what guests and staff see, order to pickup.' },
  { title: 'Set up together', body: 'Your menu, your tables and your QR codes, ready to print.' },
]

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
    <section id="contact" className="px-2 py-4 sm:px-4">
      <div className="overflow-hidden rounded-[28px] bg-accent text-on-accent sm:rounded-[36px]">
        {/* Phones: intro, number, then the steps, so Call is near the top. Desktop: the steps sit in
            a row under the intro with the number beside them, so it all fits a ~650px-tall window */}
        <div className="mx-auto grid max-w-6xl gap-y-10 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-x-16 lg:gap-y-8">
          <Reveal className="lg:col-start-1 lg:row-start-1">
            <p className="font-mono text-xs uppercase tracking-widest">Book a demo</p>
            <h2 className="mt-3 font-display text-[clamp(3rem,min(10vw,12vh),5.5rem)] leading-[0.9] tracking-[-0.045em]">
              You’re next.
            </h2>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed">
              See Qyou working at your own tables. Call or text, and we’ll set it up with you.
            </p>
          </Reveal>

          <Reveal delay={0.05} className="lg:col-start-1 lg:row-start-2">
            <ol className="max-w-md lg:grid lg:max-w-none lg:grid-cols-3 lg:gap-6">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <div className="h-px bg-current opacity-25" aria-hidden />
                  <div className="flex gap-4 py-4 lg:flex-col lg:gap-2 lg:pb-0">
                    <span className="pt-0.5 font-mono text-xs tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <p className="font-display text-xl leading-tight tracking-[-0.02em]">{s.title}</p>
                      <p className="mt-1 text-[15px] leading-relaxed">{s.body}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <div className="h-px max-w-md bg-current opacity-25 lg:hidden" aria-hidden />

            <Link
              to={PRODUCT.demoTablePath}
              className="group mt-6 inline-flex min-h-11 items-center gap-2 text-[15px] font-medium underline decoration-1 underline-offset-4"
            >
              Rather look around first? Try the live demo
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </Reveal>

          <Reveal
            delay={0.1}
            className="row-start-2 w-full max-w-[400px] justify-self-center lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center lg:justify-self-end"
          >
            <div className="lg:rotate-[1.5deg]">
              <TiltCard max={6} className="drop-shadow-2xl">
                <Ticket
                  bodyClassName="px-6 pb-6 pt-5"
                  stubClassName="p-5"
                  stub={
                    <div className="grid grid-cols-2 gap-2.5">
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
                          className={buttonClasses({ variant: 'secondary', size: 'lg' }, cn(more.length === 1 && 'col-span-2'))}
                        >
                          {m.icon}
                          {m.label}
                        </a>
                      ))}
                      <button type="button" onClick={copyNumber} className={buttonClasses({ variant: 'ghost', size: 'md' }, 'col-span-2')}>
                        {copied ? <Check /> : <Copy />}
                        <span aria-live="polite">{copied ? 'Number copied' : 'Copy number'}</span>
                      </button>
                    </div>
                  }
                >
                  <div className="flex items-center justify-between font-mono text-xs uppercase tracking-widest text-ink-muted">
                    <span>Next up</span>
                    <span>Nº 001</span>
                  </div>
                  <a
                    href={`tel:${phone}`}
                    className="mt-4 flex min-h-11 items-center font-display text-[clamp(2.1rem,8vw,2.75rem)] leading-none tracking-[-0.03em] text-ink tabular-nums hover:text-accent-text"
                  >
                    {formatPhone(phone)}
                  </a>
                  <p className="mt-2 text-sm text-ink-muted">Call or text to book your demo.</p>
                </Ticket>
              </TiltCard>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
