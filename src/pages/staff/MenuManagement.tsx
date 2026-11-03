import { Pencil, Plus, Trash2, UtensilsCrossed } from 'lucide-react'
import { useState, useCallback, useId, type FormEvent } from 'react'
import { useMenu } from '../../context/MenuContext'
import { useSidebar } from '../../context/SidebarContext'
import { MENU_CATEGORIES, type MenuItem } from '../../constants/menu'
import StaffPageShell from '../../components/StaffPageShell'
import StaffHeader from '../../components/StaffHeader'
import {
  BottomSheet, Button, EmptyState, IconButton, LetterTile, Switch, TextInput, cn, fieldClasses,
} from '../../components/ui'
import { peso } from '../../utils/formatters'

type EditableItem = { name: string; price: string; category: string }
const ADD_ON_CATEGORY = 'Add-ons'
const CATEGORIES = [...MENU_CATEGORIES, ADD_ON_CATEGORY]
const EMPTY_FORM: EditableItem = { name: '', price: '', category: 'Coffee' }

export default function MenuManagement() {
  const { items: menuItems, addOns, toggleItemAvailability, saveItem, removeItem } = useMenu()
  const { expanded: sidebarExpanded, toggle: toggleSidebar } = useSidebar()
  // Every change is saved to the order backend and reaches guests' phones at once
  const items = [...menuItems, ...addOns]
  // null = sheet closed, 'new' = adding, number = editing that item
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<EditableItem>(EMPTY_FORM)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [listError, setListError] = useState('')
  const categoryId = useId()

  const openEdit = useCallback((item: MenuItem) => {
    setForm({ name: item.name, price: String(item.price), category: item.category })
    setDescription(item.description)
    setFormError('')
    setEditing(item.id)
  }, [])

  const openAdd = useCallback(() => {
    setForm(EMPTY_FORM)
    setDescription('')
    setFormError('')
    setEditing('new')
  }, [])

  const canSave = !!form.name.trim() && form.price.trim() !== '' && !saving

  const run = async (write: () => Promise<void>) => {
    setSaving(true)
    setFormError('')
    try {
      await write()
      setEditing(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!canSave || editing === null) return
    void run(() => saveItem({
      ...(editing === 'new' ? {} : { id: editing }),
      name: form.name.trim(),
      price: Number(form.price),
      category: form.category,
      description,
      addon: form.category === ADD_ON_CATEGORY,
    }))
  }

  const remove = () => {
    if (typeof editing === 'number') void run(() => removeItem(editing))
  }

  const toggle = (id: number) => {
    setListError('')
    toggleItemAvailability(id).catch(err => setListError(err instanceof Error ? err.message : String(err)))
  }

  const availableCount = menuItems.filter(i => i.available).length
  const groups = CATEGORIES
    .map(c => ({ title: c, items: items.filter(i => i.category === c) }))
    .filter(g => g.items.length > 0)

  return (
    <StaffPageShell>
      <StaffHeader
        title="Menu"
        subtitle={`${availableCount} of ${menuItems.length} available today`}
        actions={<Button variant="primary" leftIcon={<Plus />} onClick={openAdd}>Add item</Button>}
        sidebarExpanded={sidebarExpanded}
        onSidebarToggle={toggleSidebar}
      />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        <p className="text-sm leading-relaxed text-ink-muted">
          Switch an item off when it runs out; guests see it as “Sold out today”. Every change reaches guests'
          phones right away. New prices apply to new orders; orders already placed keep theirs.
        </p>
        {listError && <p role="alert" className="text-sm text-status-cancelled-text">{listError}</p>}

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
                  const isAvailable = item.available
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
                        onChange={() => toggle(item.id)}
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
          {formError && <p role="alert" className="text-sm text-status-cancelled-text">{formError}</p>}
          <div className="flex gap-3 pt-2">
            {typeof editing === 'number' && (
              <Button variant="danger" leftIcon={<Trash2 />} onClick={remove} disabled={saving}>Delete</Button>
            )}
            <Button type="submit" variant="primary" disabled={!canSave} className="flex-1">
              {saving ? 'Saving…' : editing === 'new' ? 'Add item' : 'Save'}
            </Button>
          </div>
        </form>
      </BottomSheet>
    </StaffPageShell>
  )
}
