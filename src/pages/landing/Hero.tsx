import { Link } from 'react-router-dom'
import { buttonClasses } from '../../components/ui'
import { PRODUCT } from '../../config/product'
import { RESTAURANT } from '../../config/restaurant'
import { FlatPhone, MenuScreen } from './PhoneScreens'

export default function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-20 lg:pb-28 lg:pt-20">
      <div className="max-w-xl">
        <h1 className="text-[clamp(2.25rem,5vw,3.5rem)] font-bold leading-[1.08] tracking-[-0.02em]">
          Let guests order from the table. Your counter gets a break.
        </h1>
        <p className="mt-6 text-[17px] leading-relaxed text-ink-muted">
          Ana scans the code on table 4, orders two caramel macchiatos and a croissant, and gets a receipt on her
          phone. Your staff see the order on the counter tablet and confirm it, and her phone rings when it’s ready.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link to={PRODUCT.demoTablePath} className={buttonClasses({ variant: 'primary', size: 'lg' })}>
            Try it as a guest
          </Link>
          <a href="#contact" className="inline-flex min-h-11 items-center text-[17px] font-medium underline decoration-1 underline-offset-4 hover:text-accent-text">
            Talk to us
          </a>
        </div>
        <p className="mt-4 text-sm text-ink-muted">Opens table 1 at {RESTAURANT.name}, in your browser. Nothing to install.</p>
      </div>

      <figure className="mx-auto w-full max-w-[280px] lg:max-w-none">
        <FlatPhone>
          <MenuScreen />
        </FlatPhone>
        <figcaption className="mt-3 text-center text-sm text-ink-muted">The menu your guests see.</figcaption>
      </figure>
    </section>
  )
}
