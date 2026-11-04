import { Camera, Check, ImageOff, ListChecks, Loader2, Pencil, Plus, RotateCcw, Trash2, UtensilsCrossed } from 'lucide-react'
import { useState, useCallback, useId, useRef, type ChangeEvent, type FormEvent } from 'react'
import { useMenu } from '../../context/MenuContext'
import { useSidebar } from '../../context/SidebarContext'
import { MENU_CATEGORIES, type MenuItem } from '../../constants/menu'
import StaffPageShell from '../../components/StaffPageShell'
import StaffHeader from '../../components/StaffHeader'
import ItemPhoto from '../../components/ItemPhoto'
import OptionGroupEditor from '../../components/OptionGroupEditor'
import type { LiveOptionGroup } from '../../services/orderSync'
import { photoFor, preparePhoto, removePhoto, resetPhoto, savePhoto, usePhotoOverrides } from '../../services/menuPhotos'
import {
  BottomSheet, Button, EmptyState, IconButton, Switch, TextInput, cn, fieldClasses,
} from '../../components/ui'
import { peso } from '../../utils/formatters'

type EditableItem = { name: string; price: string; category: string }
/** A photo change waiting for Save: a new photo, no photo (null), or back to the built-in one. */
type PhotoDraft = { src: string | null; reset?: boolean } | undefined
const ADD_ON_CATEGORY = 'Add-ons'
const CATEGORIES = [...MENU_CATEGORIES, ADD_ON_CATEGORY]
const EMPTY_FORM: EditableItem = { name: '', price: '', category: 'Coffee' }

/** "Regular, Large +₱30" */
const choicesSummary = (g: LiveOptionGroup) =>
  g.choices.map(c => (c.price > 0 ? `${c.name} +${peso(c.price)}` : c.name)).join(', ')

export default function MenuManagement() {
  const {
    items: menuItems, addOns, optionGroups, toggleItemAvailability, saveItem, removeItem, saveOptionGroup, removeOptionGroup,
  } = useMenu()
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
  // The option groups this item asks for, in the order guests see them
  const [optionIds, setOptionIds] = useState<number[]>([])
  // null = closed, 'new' = adding, or the group being edited
  const [editingGroup, setEditingGroup] = useState<LiveOptionGroup | 'new' | null>(null)
  const categoryId = useId()
  const photoNoteId = useId()
  const overrides = usePhotoOverrides()
  const fileRef = useRef<HTMLInputElement>(null)
  const [photoDraft, setPhotoDraft] = useState<PhotoDraft>(undefined)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState('')

  const editedItem = typeof editing === 'number' ? items.find(i => i.id === editing) : undefined
  // What the photo will be after Save
  const savedPhoto = editedItem ? photoFor(editedItem, overrides) : null
  const previewPhoto = photoDraft ? (photoDraft.reset ? editedItem?.image ?? null : photoDraft.src) : savedPhoto
  const changedFromBuiltIn = !!editedItem?.image && (photoDraft ? !photoDraft.reset : editedItem.id in overrides)

  const resetPhotoForm = () => { setPhotoDraft(undefined); setPhotoError(''); setPhotoBusy(false) }

  const openEdit = useCallback((item: MenuItem) => {
    setForm({ name: item.name, price: String(item.price), category: item.category })
    setDescription(item.description)
    setOptionIds(item.optionGroupIds ?? [])
    setFormError('')
    resetPhotoForm()
    setEditing(item.id)
  }, [])

  const openAdd = useCallback(() => {
    setForm(EMPTY_FORM)
    setDescription('')
    setOptionIds([])
    setFormError('')
    resetPhotoForm()
    setEditing('new')
  }, [])

  const pickPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoError('')
    setPhotoBusy(true)
    try {
      setPhotoDraft({ src: await preparePhoto(file) })
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'This photo couldn’t be used. Try another one.')
    } finally {
      setPhotoBusy(false)
    }
  }

  const canSave = !!form.name.trim() && form.price.trim() !== '' && !saving && !photoBusy

  /** Runs a save or delete; closes the sheet unless it returns false (the reason is already shown). */
  const run = async (write: () => Promise<boolean | void>) => {
    setSaving(true)
    setFormError('')
    try {
      if ((await write()) !== false) setEditing(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  /** Stores the photo change; false (with the reason shown) when the device is full. */
  const applyPhoto = (id: number) => {
    if (!photoDraft) return true
    try {
      if (photoDraft.reset) resetPhoto(id)
      else if (photoDraft.src === null) removePhoto(id)
      else savePhoto(id, photoDraft.src)
      return true
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'The photo couldn’t be saved.')
      return false
    }
  }

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!canSave || editing === null) return
    void run(async () => {
      const saved = await saveItem({
        ...(editing === 'new' ? {} : { id: editing }),
        name: form.name.trim(),
        price: Number(form.price),
        category: form.category,
        description,
        addon: form.category === ADD_ON_CATEGORY,
        // Add-ons are extras themselves; they don't take options
        optionGroupIds: form.category === ADD_ON_CATEGORY ? [] : optionIds,
      })
      // Photos stay on this device for now, under the id the server gave the item
      return applyPhoto(saved.id)
    })
  }

  const remove = () => {
    if (typeof editing !== 'number') return
    const id = editing
    void run(async () => {
      await removeItem(id)
      // Don't leave its photo behind for a future item with the same number
      if (id in overrides) resetPhoto(id)
    })
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
          phones right away. New prices apply to new orders; orders already placed keep theirs. Photos are
          saved on this device only, for now.
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
                      <ItemPhoto item={item} dimmed={!isAvailable} className="h-12 w-12 shrink-0 rounded-control border border-line" />
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-[15px] font-medium leading-snug', isAvailable ? 'text-ink' : 'text-ink-muted')}>{item.name}</p>
                        <p className="text-[13px] tabular-nums text-ink-muted">
                          {peso(item.price)}
                          {!isAvailable && ' · Sold out'}
                          {(item.optionGroupIds?.length ?? 0) > 0 && ` · ${item.optionGroupIds!.length} ${item.optionGroupIds!.length === 1 ? 'option' : 'options'}`}
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

        <section aria-labelledby="option-groups">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="option-groups" className="font-display text-xl text-ink">Options</h2>
            <Button variant="ghost" leftIcon={<Plus />} onClick={() => setEditingGroup('new')} className="-mr-3">Add option group</Button>
          </div>
          <p className="mb-3 text-sm text-ink-muted">Choices guests make, like size or sugar level. Turn them on per item in the item's editor.</p>
          {optionGroups.length === 0 ? (
            <EmptyState icon={ListChecks} title="No options yet" body="Add sizes, sugar levels or extras guests can choose." />
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
              {optionGroups.map(g => (
                <li key={g.id} className="flex items-center gap-3 py-2 pl-4 pr-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium leading-snug text-ink">
                      {g.name}
                      <span className="ml-2 text-[13px] font-normal text-ink-muted">
                        {g.required ? (g.multiple ? 'Pick one or more' : 'Pick one') : 'Optional'}
                      </span>
                    </p>
                    <p className="text-[13px] text-ink-muted">{choicesSummary(g)}</p>
                  </div>
                  <IconButton label={`Edit ${g.name} options`} onClick={() => setEditingGroup(g)}>
                    <Pencil />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <BottomSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New item' : 'Edit item'}
      >
        <form onSubmit={save} className="space-y-4">
          {/* Photo: preview and the ways to change it; applied on Save */}
          <fieldset aria-describedby={photoNoteId}>
            <legend className="mb-1.5 text-sm font-medium text-ink">Photo</legend>
            <div className="flex items-start gap-4">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-card border border-line">
                <ItemPhoto
                  item={{ id: -1, name: form.name || '?', image: previewPhoto ?? undefined }}
                  className="h-full w-full"
                />
                {photoBusy && (
                  <span className="absolute inset-0 flex items-center justify-center bg-scrim text-on-accent" role="status">
                    <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                    <span className="sr-only">Preparing photo…</span>
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-col items-start gap-1">
                <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="sr-only" tabIndex={-1} aria-hidden />
                <Button leftIcon={<Camera />} onClick={() => fileRef.current?.click()} disabled={photoBusy}>
                  {previewPhoto ? 'Change photo' : 'Add photo'}
                </Button>
                {previewPhoto && (
                  <Button variant="ghost" leftIcon={<ImageOff />} onClick={() => setPhotoDraft({ src: null })} className="-ml-1 text-ink-muted">
                    Remove photo
                  </Button>
                )}
                {changedFromBuiltIn && (
                  <Button variant="ghost" leftIcon={<RotateCcw />} onClick={() => setPhotoDraft({ src: null, reset: true })} className="-ml-1 text-ink-muted">
                    Use original photo
                  </Button>
                )}
              </div>
            </div>
            {photoError ? (
              <p id={photoNoteId} role="alert" className="mt-2 text-sm text-status-cancelled-text">{photoError}</p>
            ) : (
              <p id={photoNoteId} className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                Square photos look best. Saved on this device for now: other phones keep the original photo
                until online sync is set up.
              </p>
            )}
          </fieldset>

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
          {form.category !== ADD_ON_CATEGORY && optionGroups.length > 0 && (
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">Options guests choose</legend>
              <div className="divide-y divide-line rounded-card border border-line">
                {optionGroups.map(g => {
                  const on = optionIds.includes(g.id)
                  return (
                    // The whole row is the target; the real checkbox is hidden behind the drawn one
                    <label
                      key={g.id}
                      className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-accent"
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => setOptionIds(prev => (on ? prev.filter(id => id !== g.id) : [...prev, g.id]))}
                        className="sr-only"
                      />
                      <span
                        aria-hidden
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] border transition-colors duration-150',
                          on ? 'border-accent bg-accent text-on-accent' : 'border-line-strong bg-surface',
                        )}
                      >
                        {on && <Check className="h-4 w-4" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] text-ink">{g.name}</span>
                        <span className="block text-[13px] text-ink-muted">{choicesSummary(g)}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )}
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

      <OptionGroupEditor
        group={editingGroup}
        onClose={() => setEditingGroup(null)}
        onSave={async group => { await saveOptionGroup(group) }}
        onRemove={removeOptionGroup}
      />
    </StaffPageShell>
  )
}
