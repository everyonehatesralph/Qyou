import { useState, useMemo } from 'react'
import { X, UtensilsCrossed, ShoppingBag, CheckCircle, Sparkles } from 'lucide-react'
import { MENU_ITEMS } from '../constants/menu'
import type { CartItemType } from '../context/CartContext'

interface Props {
  cartItems: CartItemType[]
  cartTotal: number
  customerName: string
  onConfirm: (opts: CheckoutOptions) => void
  onClose: () => void
}

export interface CheckoutOptions {
  dineIn: boolean
  addOns: AddOn[]
  notes: string
}

interface AddOn {
  id: string
  label: string
  price: number
}

const ADD_ONS: AddOn[] = [
  { id: 'extra-shot',  label: '+ Extra Espresso Shot', price: 30  },
  { id: 'oat-milk',   label: '+ Oat Milk Upgrade',     price: 25  },
  { id: 'extra-sugar',label: '+ Extra Sugar',           price: 0   },
  { id: 'less-ice',   label: '+ Less Ice',              price: 0   },
  { id: 'whip',       label: '+ Whipped Cream',         price: 20  },
  { id: 'syrup',      label: '+ Caramel Syrup',         price: 15  },
]

// Simple recommendation: items in the same categories NOT already in cart
function getRecommendations(cartItems: CartItemType[]) {
  const cartIds = new Set(cartItems.map(i => i.id))
  const cartCats = new Set(cartItems.map(i => i.category))
  // Items from same categories, not in cart, available
  const same = MENU_ITEMS.filter(i => cartCats.has(i.category) && !cartIds.has(i.id) && i.available)
  // Items from different categories for variety
  const diff = MENU_ITEMS.filter(i => !cartCats.has(i.category) && !cartIds.has(i.id) && i.available)
  return [...same, ...diff].slice(0, 3)
}

type Step = 'dine' | 'addons' | 'recommend' | 'confirm'

export default function OrderCheckoutModal({ cartItems, cartTotal, customerName, onConfirm, onClose }: Props) {
  const [step,       setStep]    = useState<Step>('dine')
  const [dineIn,     setDineIn]  = useState<boolean | null>(null)
  const [addOns,     setAddOns]  = useState<AddOn[]>([])
  const [notes,      setNotes]   = useState('')

  const recs = useMemo(() => getRecommendations(cartItems), [cartItems])

  const addOnTotal = addOns.reduce((s, a) => s + a.price, 0)
  const grandTotal = cartTotal + addOnTotal

  const toggleAddOn = (addon: AddOn) => {
    setAddOns(prev =>
      prev.find(a => a.id === addon.id)
        ? prev.filter(a => a.id !== addon.id)
        : [...prev, addon]
    )
  }

  const steps: Step[] = ['dine', 'addons', 'recommend', 'confirm']
  const stepIdx = steps.indexOf(step)

  const next = () => setStep(steps[stepIdx + 1] as Step)
  const back = () => setStep(steps[stepIdx - 1] as Step)

  const STEP_LABELS = ['Dine In / Take Away', 'Add-ons', 'You May Also Like', 'Confirm Order']

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: '#171210', border: '1px solid #2E2318', maxHeight: '92vh' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid #2E2318' }}
        >
          <div>
            <p className="text-xs text-text-muted mb-0.5">Step {stepIdx + 1} of {steps.length}</p>
            <h2 className="text-text-base font-bold">{STEP_LABELS[stepIdx]}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: '#9B8B7A' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 flex-shrink-0" style={{ backgroundColor: '#2E2318' }}>
          <div
            className="h-1 transition-all duration-500"
            style={{ width: `${((stepIdx + 1) / steps.length) * 100}%`, backgroundColor: '#C8860A' }}
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* ── Step 1: Dine In / Take Away ─────────────────────────────── */}
          {step === 'dine' && (
            <div>
              <p className="text-text-muted text-sm mb-5">How would you like your order?</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: true,  icon: UtensilsCrossed, label: 'Dine In',   sub: 'Served at your table' },
                  { val: false, icon: ShoppingBag,      label: 'Take Away', sub: 'Packed to go'        },
                ].map(opt => (
                  <button
                    key={String(opt.val)}
                    onClick={() => setDineIn(opt.val)}
                    className="flex flex-col items-center gap-2 p-5 rounded-xl transition-all"
                    style={{
                      border: dineIn === opt.val ? '2px solid #C8860A' : '2px solid #2E2318',
                      backgroundColor: dineIn === opt.val ? 'rgba(200,134,10,0.1)' : '#211A15',
                    }}
                  >
                    <opt.icon
                      className="w-8 h-8"
                      style={{ color: dineIn === opt.val ? '#C8860A' : '#9B8B7A' }}
                    />
                    <p
                      className="font-bold text-sm"
                      style={{ color: dineIn === opt.val ? '#C8860A' : '#F0E6D3' }}
                    >
                      {opt.label}
                    </p>
                    <p className="text-xs text-text-muted">{opt.sub}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Add-ons ──────────────────────────────────────────── */}
          {step === 'addons' && (
            <div>
              <p className="text-text-muted text-sm mb-4">Would you like to add anything extra?</p>
              <div className="space-y-2 mb-5">
                {ADD_ONS.map(addon => {
                  const selected = addOns.some(a => a.id === addon.id)
                  return (
                    <button
                      key={addon.id}
                      onClick={() => toggleAddOn(addon)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left"
                      style={{
                        border: selected ? '1.5px solid #C8860A' : '1.5px solid #2E2318',
                        backgroundColor: selected ? 'rgba(200,134,10,0.08)' : '#211A15',
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          backgroundColor: selected ? '#C8860A' : 'transparent',
                          border: selected ? 'none' : '1.5px solid #4B3B2A',
                        }}
                      >
                        {selected && <CheckCircle className="w-3.5 h-3.5" style={{ color: '#0D0B0A' }} />}
                      </div>
                      <span className="flex-1 text-sm" style={{ color: selected ? '#F0E6D3' : '#9B8B7A' }}>
                        {addon.label}
                      </span>
                      {addon.price > 0 && (
                        <span className="text-xs font-semibold" style={{ color: '#C8860A' }}>
                          +₱{addon.price}
                        </span>
                      )}
                      {addon.price === 0 && (
                        <span className="text-xs" style={{ color: '#4ADE80' }}>Free</span>
                      )}
                    </button>
                  )
                })}
              </div>
              {/* Special instructions */}
              <label className="block text-text-muted text-xs font-medium mb-2">Special instructions (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="E.g. no ice, extra hot, allergy notes…"
                rows={2}
                className="w-full rounded-xl text-sm px-4 py-3 resize-none outline-none"
                style={{ backgroundColor: '#211A15', border: '1px solid #2E2318', color: '#F0E6D3' }}
              />
            </div>
          )}

          {/* ── Step 3: Recommendations ─────────────────────────────────── */}
          {step === 'recommend' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4" style={{ color: '#C8860A' }} />
                <p className="text-text-muted text-sm">You might also enjoy these</p>
              </div>
              {recs.length === 0 ? (
                <p className="text-text-faint text-sm text-center py-6">You've got great taste — your order looks complete!</p>
              ) : (
                <div className="space-y-3">
                  {recs.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ backgroundColor: '#211A15', border: '1px solid #2E2318' }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                        style={{ backgroundColor: 'rgba(200,134,10,0.1)' }}
                      >
                        ☕
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-base text-sm font-semibold truncate">{item.name}</p>
                        <p className="text-text-muted text-xs truncate">{item.description}</p>
                      </div>
                      <span className="font-bold text-sm flex-shrink-0" style={{ color: '#C8860A' }}>₱{item.price}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-text-faint text-xs text-center mt-4">
                To add these, close and add them from the menu.
              </p>
            </div>
          )}

          {/* ── Step 4: Confirm ──────────────────────────────────────────── */}
          {step === 'confirm' && (
            <div>
              {/* Order summary */}
              <div className="rounded-xl overflow-hidden mb-4" style={{ border: '1px solid #2E2318' }}>
                <div
                  className="px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider"
                  style={{ backgroundColor: '#211A15' }}
                >
                  Your Order
                </div>
                {cartItems.map(item => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center px-4 py-2.5 text-sm"
                    style={{ borderTop: '1px solid #2E2318' }}
                  >
                    <span className="text-text-base">{item.name} ×{item.quantity}</span>
                    <span style={{ color: '#C8860A' }}>₱{(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
                {addOns.map(addon => (
                  <div
                    key={addon.id}
                    className="flex justify-between items-center px-4 py-2 text-sm"
                    style={{ borderTop: '1px solid #2E2318' }}
                  >
                    <span className="text-text-muted">{addon.label}</span>
                    <span style={{ color: addon.price > 0 ? '#C8860A' : '#4ADE80' }}>
                      {addon.price > 0 ? `+₱${addon.price}` : 'Free'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Meta */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Order type</span>
                  <span className="text-text-base font-semibold">
                    {dineIn ? '🍽️ Dine In' : '🛍️ Take Away'}
                  </span>
                </div>
                {notes && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Notes</span>
                    <span className="text-text-base text-right max-w-[60%]">{notes}</span>
                  </div>
                )}
                {customerName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Name</span>
                    <span className="text-text-base font-semibold">{customerName}</span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div
                className="flex justify-between items-center px-4 py-3 rounded-xl"
                style={{ backgroundColor: 'rgba(200,134,10,0.1)', border: '1px solid rgba(200,134,10,0.25)' }}
              >
                <span className="font-bold text-text-base">Total</span>
                <span className="font-bold text-xl" style={{ color: '#C8860A' }}>₱{grandTotal.toFixed(0)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div
          className="flex gap-3 px-5 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid #2E2318', backgroundColor: '#171210' }}
        >
          {stepIdx > 0 && (
            <button
              onClick={back}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ backgroundColor: '#211A15', color: '#9B8B7A', border: '1px solid #2E2318' }}
            >
              Back
            </button>
          )}

          {step !== 'confirm' ? (
            <button
              onClick={next}
              disabled={step === 'dine' && dineIn === null}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
              style={{ backgroundColor: '#C8860A', color: '#0D0B0A' }}
            >
              {step === 'recommend' ? 'Looks good →' : 'Next →'}
            </button>
          ) : (
            <button
              onClick={() => onConfirm({ dineIn: dineIn ?? true, addOns, notes })}
              className="flex-1 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={{ backgroundColor: '#C8860A', color: '#0D0B0A', boxShadow: '0 0 20px rgba(200,134,10,0.35)' }}
            >
              ✓ Place Order · ₱{grandTotal.toFixed(0)}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
