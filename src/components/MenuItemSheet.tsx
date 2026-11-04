import { useEffect, useRef, useState } from 'react'
import type { MenuItem } from '../constants/menu'
import { RESTAURANT } from '../config/restaurant'
import type { OptionGroupLike } from '../services/orderModel'
import ItemPhoto from './ItemPhoto'
import { BottomSheet, Button, QuantityStepper, cn } from './ui'

const peso = (n: number) => `${RESTAURANT.currency}${n.toFixed(0)}`

interface Props {
  item: MenuItem | null
  available: boolean
  qty: number
  /** The item's option groups (size, sugar…); none for items added as they are. */
  groups?: OptionGroupLike[]
  onClose: () => void
  /** First one in: the button it was added from (for the flight into the cart). */
  onAdd: (button: HTMLButtonElement) => void
  onChange: (next: number) => void
  /** Items with options: add `quantity` with these choices. */
  onAddWithOptions?: (choices: number[], quantity: number, button: HTMLButtonElement) => void
}

/** The usual picks: the first choice of every required single-choice group (Regular, Hot, 100%…). */
const defaults = (groups: OptionGroupLike[]) =>
  Object.fromEntries(groups.map(g => [g.id, g.required && !g.multiple && g.choices[0] ? [g.choices[0].id] : []]))

/** An item up close: big photo, description and price, its options, and the add control at the bottom. */
export default function MenuItemSheet({ item: openItem, available, qty, groups = [], onClose, onAdd, onChange, onAddWithOptions }: Props) {
  // Keep showing the last item while the sheet slides away
  const last = useRef(openItem)
  if (openItem) last.current = openItem
  const item = last.current
  // Add and the stepper swap places; focus moves to whichever replaces the other
  const handoff = useRef<'add' | 'plus' | null>(null)
  const grab = (to: 'add' | 'plus') => (el: HTMLButtonElement | null) => {
    if (el && handoff.current === to) { handoff.current = null; el.focus() }
  }

  // Options: picks per group and how many, fresh each time an item opens
  const lastGroups = useRef(groups)
  if (openItem) lastGroups.current = groups
  const shownGroups = lastGroups.current
  const [picked, setPicked] = useState<Record<number, number[]>>({})
  const [count, setCount] = useState(1)
  useEffect(() => {
    if (!openItem) return
    setPicked(defaults(groups))
    setCount(1)
    // Only when a different item opens; the groups can refresh live underneath
  }, [openItem?.id])

  const withOptions = shownGroups.length > 0
  const choices = shownGroups.flatMap(g => picked[g.id] ?? [])
  const extra = shownGroups.reduce((s, g) => s + g.choices.filter(c => (picked[g.id] ?? []).includes(c.id)).reduce((a, c) => a + c.price, 0), 0)
  const missing = shownGroups.filter(g => g.required && (picked[g.id] ?? []).length === 0)
  const unit = (item?.price ?? 0) + extra

  const toggle = (g: OptionGroupLike, choiceId: number) => {
    setPicked(prev => {
      const now = prev[g.id] ?? []
      if (!g.multiple) return { ...prev, [g.id]: [choiceId] }
      return { ...prev, [g.id]: now.includes(choiceId) ? now.filter(id => id !== choiceId) : [...now, choiceId] }
    })
  }

  const footer = () => {
    if (!item) return null
    if (!available) return <Button size="lg" fullWidth disabled>Sold out today</Button>
    if (withOptions) {
      return (
        <div className="flex items-center gap-3">
          <QuantityStepper
            value={count}
            min={1}
            max={50}
            onChange={setCount}
            itemName={item.name}
            className="h-[52px] [&>button]:h-[52px] [&>button]:w-[52px]"
          />
          <Button
            variant="primary"
            size="lg"
            disabled={missing.length > 0}
            onClick={e => onAddWithOptions?.(choices, count, e.currentTarget)}
            className="flex-1 justify-between"
          >
            <span>{missing.length > 0 ? `Pick ${missing[0].name.toLowerCase()}` : 'Add to cart'}</span>
            <span className="tabular-nums">{peso(unit * count)}</span>
          </Button>
        </div>
      )
    }
    return qty === 0 ? (
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
  }

  return (
    <BottomSheet
      open={openItem !== null}
      onClose={onClose}
      title={item?.name}
      description={item ? (available ? (withOptions ? `From ${peso(item.price)}` : peso(item.price)) : 'Sold out today') : undefined}
      footer={footer()}
    >
      {item && (
        <div className="space-y-4">
          <ItemPhoto item={item} eager dimmed={!available} className="aspect-[4/3] rounded-card short:aspect-auto short:h-[34dvh]" />
          {item.description && <p className="text-[15px] leading-relaxed text-ink-muted">{item.description}</p>}
          {available && shownGroups.map(g => (
            <fieldset key={g.id} className="pt-1">
              <legend className="flex w-full items-baseline justify-between gap-3 text-[15px] font-semibold text-ink">
                <span>{g.name}</span>
                <span className="text-xs font-normal text-ink-muted">
                  {g.required ? (g.multiple ? 'Pick at least one' : 'Pick one') : 'Optional'}
                </span>
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {g.choices.map(c => {
                  const checked = (picked[g.id] ?? []).includes(c.id)
                  return (
                    <label
                      key={c.id}
                      className={cn(
                        'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-[15px] transition-colors duration-150',
                        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface',
                        checked ? 'border-ink bg-ink text-bg' : 'border-line-strong bg-surface text-ink hover:border-ink',
                      )}
                    >
                      <input
                        type={g.multiple ? 'checkbox' : 'radio'}
                        name={`option-group-${g.id}`}
                        value={c.id}
                        checked={checked}
                        onChange={() => toggle(g, c.id)}
                        className="sr-only"
                      />
                      {c.name}
                      {c.price > 0 && <span className={cn('tabular-nums', checked ? 'text-bg' : 'text-ink-muted')}>+{peso(c.price)}</span>}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </div>
      )}
    </BottomSheet>
  )
}
