import { useState } from 'react'
import { Check, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import type { CartItemType } from '../context/CartContext'
import { RESTAURANT } from '../config/restaurant'
import { BottomSheet, Button, Segmented, TextArea, cn } from './ui'

interface Props {
  open: boolean
  cartItems: CartItemType[]
  cartTotal: number
  tableName: string
  placing?: boolean
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

// Labels keep their "+ " prefix: they are written into the order notes as-is
const ADD_ONS: AddOn[] = [
  { id: 'extra-shot',  label: '+ Extra Espresso Shot', price: 30  },
  { id: 'oat-milk',   label: '+ Oat Milk Upgrade',     price: 25  },
  { id: 'extra-sugar',label: '+ Extra Sugar',           price: 0   },
  { id: 'less-ice',   label: '+ Less Ice',              price: 0   },
  { id: 'whip',       label: '+ Whipped Cream',         price: 20  },
  { id: 'syrup',      label: '+ Caramel Syrup',         price: 15  },
]

const peso = (n: number) => `${RESTAURANT.currency}${n.toFixed(0)}`

type OrderType = 'dineIn' | 'takeaway'

/** Checkout sheet: order type, add-ons, notes, total, Place order. */
export default function OrderCheckoutModal({ open, cartItems, cartTotal, tableName, placing, onConfirm, onClose }: Props) {
  const [orderType, setOrderType] = useState<OrderType | null>(null)
  const [addOns, setAddOns] = useState<AddOn[]>([])
  const [notes, setNotes] = useState('')

  const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0)
  const addOnTotal = addOns.reduce((s, a) => s + a.price, 0)
  const grandTotal = cartTotal + addOnTotal

  const toggleAddOn = (addon: AddOn) => {
    setAddOns(prev =>
      prev.find(a => a.id === addon.id)
        ? prev.filter(a => a.id !== addon.id)
        : [...prev, addon]
    )
  }

  const submit = () => {
    if (!orderType) return
    onConfirm({ dineIn: orderType === 'dineIn', addOns, notes })
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Checkout"
      description={`${itemCount} ${itemCount === 1 ? 'item' : 'items'}${tableName ? ` · ${tableName}` : ''}`}
      footer={
        <>
          {!orderType && <p className="mb-3 text-center text-sm text-ink-muted">Choose dine in or take away to continue.</p>}
          <Button variant="primary" size="lg" fullWidth disabled={!orderType || placing} onClick={submit} className="justify-between">
            <span>{placing ? 'Placing order…' : 'Place order'}</span>
            <span className="tabular-nums">{peso(grandTotal)}</span>
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <Segmented<OrderType>
          label="Order type"
          value={orderType}
          onChange={setOrderType}
          options={[
            { value: 'dineIn', label: 'Dine in', icon: <UtensilsCrossed />, hint: 'Served at your table' },
            { value: 'takeaway', label: 'Take away', icon: <ShoppingBag />, hint: 'Packed to go' },
          ]}
        />

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">Add-ons</legend>
          <div className="divide-y divide-line overflow-hidden rounded-card border border-line">
            {ADD_ONS.map(addon => {
              const selected = addOns.some(a => a.id === addon.id)
              return (
                <button
                  key={addon.id}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  onClick={() => toggleAddOn(addon)}
                  className="flex min-h-[48px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-surface-2"
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors duration-150',
                      selected ? 'border-accent bg-accent text-on-accent' : 'border-line-strong bg-surface',
                    )}
                  >
                    {selected && <Check className="h-3.5 w-3.5 animate-pop" strokeWidth={3} />}
                  </span>
                  <span className="flex-1 text-[15px] text-ink">{addon.label.replace(/^\+\s*/, '')}</span>
                  <span className="text-sm tabular-nums text-ink-muted">{addon.price > 0 ? `+${peso(addon.price)}` : 'Free'}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <TextArea
          label="Notes for the kitchen (optional)"
          placeholder="e.g. no ice, extra hot, allergies"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
        />

        <dl className="space-y-1.5 text-[15px]">
          <div className="flex justify-between text-ink-muted">
            <dt>Items</dt>
            <dd className="tabular-nums">{peso(cartTotal)}</dd>
          </div>
          {addOnTotal > 0 && (
            <div className="flex justify-between text-ink-muted">
              <dt>Add-ons</dt>
              <dd className="tabular-nums">+{peso(addOnTotal)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-2 font-medium text-ink">
            <dt>Total</dt>
            <dd className="tabular-nums">{peso(grandTotal)}</dd>
          </div>
        </dl>
      </div>
    </BottomSheet>
  )
}
