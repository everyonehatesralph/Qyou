import LandingHeader from './landing/LandingHeader'
import Hero from './landing/Hero'
import HowItWorks from './landing/HowItWorks'
import TeamFeatures from './landing/TeamFeatures'
import Faq from './landing/Faq'
import Contact from './landing/Contact'
import LandingFooter from './landing/LandingFooter'

/** Qyou's product page for restaurant and café owners. */
export default function Landing() {
  return (
    <div id="top" className="min-h-screen bg-bg text-ink">
      <LandingHeader />
      <main>
        <Hero />
        <HowItWorks />
        <TeamFeatures />
        <Faq />
        <Contact />
      </main>
      <LandingFooter />
    </div>
  )
}
