import { useRef } from 'react'
import type { MenuItem } from '../constants/menu'
import { RESTAURANT } from '../config/restaurant'
import ItemPhoto from './ItemPhoto'
import { BottomSheet, Button, QuantityStepper } from './ui'

const peso = (n: number) => `${RESTAURANT.currency}${n.toFixed(0)}`

interface Props {
  item: MenuItem | null
  available: boolean
  qty: number
  onClose: () => void
  /** First one in: the button it was added from (for the flight into the cart). */
  onAdd: (button: HTMLButtonElement) => void
  onChange: (next: number) => void
}

/** An item up close: big photo, description and price, with the add control at the bottom. */
export default function MenuItemSheet({ item: openItem, available, qty, onClose, onAdd, onChange }: Props) {
  // Keep showing the last item while the sheet slides away
  const last = useRef(openItem)
  if (openItem) last.current = openItem
  const item = last.current
  // Add and the stepper swap places; focus moves to whichever replaces the other
  const handoff = useRef<'add' | 'plus' | null>(null)
  const grab = (to: 'add' | 'plus') => (el: HTMLButtonElement | null) => {
    if (el && handoff.current === to) { handoff.current = null; el.focus() }
  }
  return (
    <BottomSheet
      open={openItem !== null}
      onClose={onClose}
      title={item?.name}
      description={item ? (available ? peso(item.price) : 'Sold out today') : undefined}
      footer={item && (available ? (
        qty === 0 ? (
          <Button ref={grab('add')} variant="primary" size="lg" fullWidth onClick={e => { handoff.current = 'plus'; onAdd(e.currentTarget) }} className="justify-between">
            <span>Add to cart</span>
            <span className="tabular-nums">{peso(item.price)}</span>
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <QuantityStepper
              value={qty}
              onChange={next => { if (next === 0) handoff.current = 'add'; onChange(next) }}
              itemName={item.name}
              incrementRef={grab('plus')}
              className="h-[52px] [&>button]:h-[52px] [&>button]:w-[52px]"
            />
            <Button variant="primary" size="lg" onClick={onClose} className="flex-1 justify-between">
              <span>Done</span>
              <span className="tabular-nums">{peso(item.price * qty)}</span>
            </Button>
          </div>
        )
      ) : (
        <Button size="lg" fullWidth disabled>Sold out today</Button>
      ))}
    >
      {item && (
        <div className="space-y-4">
          <ItemPhoto item={item} eager dimmed={!available} className="aspect-[4/3] rounded-card short:aspect-auto short:h-[34dvh]" />
          {item.description && <p className="text-[15px] leading-relaxed text-ink-muted">{item.description}</p>}
        </div>
      )}
    </BottomSheet>
  )
}
