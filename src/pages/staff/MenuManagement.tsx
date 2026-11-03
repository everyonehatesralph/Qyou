import { Pencil, Plus, Trash2, UtensilsCrossed } from 'lucide-react'
import { useState, useCallback, useId, type FormEvent } from 'react'
import { useMenuAvailability } from '../../context/MenuAvailabilityContext'
import { useSidebar } from '../../context/SidebarContext'
import { MENU_ITEMS, type MenuItem } from '../../constants/menu'
import StaffPageShell from '../../components/StaffPageShell'
import StaffHeader from '../../components/StaffHeader'
import {
  BottomSheet, Button, EmptyState, IconButton, LetterTile, Switch, TextInput, cn, fieldClasses,
} from '../../components/ui'
import { peso } from '../../utils/formatters'

type EditableItem = { name: string; price: string; category: string }
const CATEGORIES = ['Coffee', 'Tea', 'Pastry', 'Food']
const EMPTY_FORM: EditableItem = { name: '', price: '', category: 'Coffee' }

export default function MenuManagement() {
  const { itemAvailability, toggleItemAvailability } = useMenuAvailability()
  const { expanded: sidebarExpanded, toggle: toggleSidebar } = useSidebar()
  // Name/price edits live in this page's state only (not saved, not shared)
  const [items, setItems] = useState<MenuItem[]>(MENU_ITEMS)
  // null = sheet closed, 'new' = adding, number = editing that item
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<EditableItem>(EMPTY_FORM)
  const categoryId = useId()

  const openEdit = useCallback((item: MenuItem) => {
    setForm({ name: item.name, price: String(item.price), category: item.category })
    setEditing(item.id)
  }, [])

  const openAdd = useCallback(() => {
    setForm(EMPTY_FORM)
    setEditing('new')
  }, [])

  const canSave = !!form.name.trim() && !!form.price

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!canSave) return
    if (editing === 'new') {
      const newId = Math.max(0, ...items.map(i => i.id)) + 1
      setItems(prev => [...prev, {
        id: newId, name: form.name,
        price: Number(form.price), category: form.category,
        description: '', available: true,
      }])
    } else if (editing !== null) {
      setItems(prev => prev.map(item =>
        item.id === editing
          ? { ...item, name: form.name, price: Number(form.price), category: form.category }
          : item,
      ))
    }
    setEditing(null)
  }

  const remove = () => {
    if (typeof editing === 'number') setItems(prev => prev.filter(item => item.id !== editing))
    setEditing(null)
  }

  const availableCount = items.filter(i => itemAvailability[i.id] !== false).length
  const groups = CATEGORIES
    .map(c => ({ title: c, items: items.filter(i => i.category === c) }))
    .filter(g => g.items.length > 0)

  return (
    <StaffPageShell>
      <StaffHeader
        title="Menu"
        subtitle={`${availableCount} of ${items.length} available today`}
        actions={<Button variant="primary" leftIcon={<Plus />} onClick={openAdd}>Add item</Button>}
        sidebarExpanded={sidebarExpanded}
        onSidebarToggle={toggleSidebar}
      />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        <p className="text-sm leading-relaxed text-ink-muted">
          Switch an item off when it runs out; guests see it as “Sold out today”. Name, price and new items
          are kept for this session only.
        </p>

        {items.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="No menu items"
            body="Add your first item to start taking orders."
            action={<Button variant="primary" leftIcon={<Plus />} onClick={openAdd}>Add item</Button>}
          />
        ) : (
          groups.map(group => (
            <section key={group.title} aria-label={group.title}>
              <h2 className="mb-2 font-display text-xl text-ink">{group.title}</h2>
              <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
                {group.items.map(item => {
                  const isAvailable = itemAvailability[item.id] !== false
                  return (
                    <li key={item.id} className={cn('flex items-center gap-3 py-2 pl-4 pr-2', !isAvailable && 'bg-surface-2')}>
                      <LetterTile text={item.name} size="sm" className={cn(!isAvailable && 'opacity-60')} />
                      <div className="min-w-0 flex-1">
                        <p className={cn('truncate text-[15px] font-medium', isAvailable ? 'text-ink' : 'text-ink-muted')}>{item.name}</p>
                        <p className="text-[13px] tabular-nums text-ink-muted">
                          {peso(item.price)}
                          {!isAvailable && ' · Sold out'}
                        </p>
                      </div>
                      <Switch
                        checked={isAvailable}
                        onChange={() => toggleItemAvailability(item.id)}
                        label={`${item.name} available today`}
                      />
                      <IconButton label={`Edit ${item.name}`} onClick={() => openEdit(item)}>
                        <Pencil />
                      </IconButton>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </main>

      <BottomSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New item' : 'Edit item'}
      >
        <form onSubmit={save} className="space-y-4">
          <TextInput
            label="Name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Iced Americano"
          />
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label="Price (₱)"
              inputMode="numeric"
              type="number"
              min={0}
              step={1}
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              placeholder="0"
            />
            <div>
              <label htmlFor={categoryId} className="mb-1.5 block text-sm font-medium text-ink">Category</label>
              <select
                id={categoryId}
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className={cn(fieldClasses(), 'h-11 px-3')}
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            {typeof editing === 'number' && (
              <Button variant="danger" leftIcon={<Trash2 />} onClick={remove}>Delete</Button>
            )}
            <Button type="submit" variant="primary" disabled={!canSave} className="flex-1">
              {editing === 'new' ? 'Add item' : 'Save'}
            </Button>
          </div>
        </form>
      </BottomSheet>
    </StaffPageShell>
  )
}
