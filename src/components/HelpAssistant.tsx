import { useState } from 'react'
import { HelpCircle, X, QrCode, Coffee, ShoppingCart, Clock, ChevronDown, ChevronUp } from 'lucide-react'
const STEPS = [
  {
    icon: QrCode,
    title: 'Scan the QR Code',
    desc: 'Point your phone camera at the QR code on your table. It will open this page automatically.',
  },
  {
    icon: Coffee,
    title: 'Browse the Menu',
    desc: 'Tap any item to add it to your cart. Use the category tabs to filter by type.',
  },
  {
    icon: ShoppingCart,
    title: 'Review Your Order',
    desc: 'Tap "View Cart" to see your items. You can adjust quantities or add special notes.',
  },
  {
    icon: Clock,
    title: 'Place & Track',
    desc: 'Tap "Place Order" and watch your order status update in real time as the kitchen prepares it.',
  },
]
const FAQS = [
  { q: 'Can I add more items after ordering?', a: 'Currently each QR scan starts a new order session. Ask a staff member to add items to your existing order.' },
  { q: 'How long will my order take?', a: 'Preparation time depends on your items. Coffee typically takes 3–5 minutes, food items 10–15 minutes.' },
  { q: 'Can I cancel my order?', a: 'Once placed, please speak to a staff member at the counter to modify or cancel your order.' },
  { q: 'Is there a service charge?', a: 'Prices shown include VAT. No additional service charge is applied.' },
  { q: 'What if the page stops working?', a: 'Try refreshing the page or scanning the QR code again. Your session will reset.' },
]
export default function HelpAssistant() {
  const [open, setOpen]         = useState(false)
  const [openFaq, setOpenFaq]   = useState<number | null>(null)
  const [tab, setTab]           = useState<'guide' | 'faq'>('guide')
  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 md:bottom-8 md:right-6 z-40
                   w-12 h-12 rounded-full shadow-lg
                   flex items-center justify-center
                   transition-all duration-200 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #C8860A, #E09B1A)', boxShadow: '0 0 20px rgba(200,134,10,0.4)' }}
        title="Need help?"
      >
        <HelpCircle className="w-6 h-6 text-white" />
      </button>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}
      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ backgroundColor: '#171210', border: '1px solid #2E2318', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: '#3D3028' }} />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h2 className="text-text-base font-bold text-lg">How can we help?</h2>
            <p className="text-text-muted text-xs mt-0.5">DeVerse Cafe ordering guide</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg hover:bg-surface-3 text-text-muted hover:text-text-base transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Tabs */}
        <div className="flex mx-5 mb-4 rounded-xl overflow-hidden" style={{ backgroundColor: '#211A15', border: '1px solid #2E2318' }}>
          {(['guide', 'faq'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-semibold transition-all rounded-xl ${
                tab === t
                  ? 'text-background'
                  : 'text-text-muted hover:text-text-base'
              }`}
              style={tab === t ? { backgroundColor: '#C8860A' } : {}}
            >
              {t === 'guide' ? '📖 Guide' : '❓ FAQ'}
            </button>
          ))}
        </div>
        <div className="px-5 pb-8">
          {tab === 'guide' ? (
            <div className="space-y-4">
              {STEPS.map((step, idx) => {
                const Icon = step.icon
                return (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(200,134,10,0.15)', border: '1px solid rgba(200,134,10,0.3)' }}
                      >
                        <Icon className="w-5 h-5" style={{ color: '#C8860A' }} />
                      </div>
                      {idx < STEPS.length - 1 && (
                        <div className="w-0.5 h-8 mt-2" style={{ backgroundColor: '#2E2318' }} />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: 'rgba(200,134,10,0.15)', color: '#C8860A' }}
                        >
                          Step {idx + 1}
                        </span>
                      </div>
                      <h3 className="text-text-base font-semibold text-sm mb-1">{step.title}</h3>
                      <p className="text-text-muted text-xs leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {FAQS.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-xl overflow-hidden"
                  style={{ backgroundColor: '#211A15', border: '1px solid #2E2318' }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                  >
                    <span className="text-text-base text-sm font-medium pr-4">{faq.q}</span>
                    {openFaq === idx
                      ? <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: '#C8860A' }} />
                      : <ChevronDown className="w-4 h-4 flex-shrink-0 text-text-muted" />
                    }
                  </button>
                  {openFaq === idx && (
                    <div className="px-4 pb-4">
                      <p className="text-text-muted text-xs leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
