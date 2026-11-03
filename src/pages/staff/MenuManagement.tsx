import { Camera, ImageOff, Loader2, Pencil, Plus, RotateCcw, Trash2, UtensilsCrossed } from 'lucide-react'
import { useState, useCallback, useId, useRef, type ChangeEvent, type FormEvent } from 'react'
import { useMenuAvailability } from '../../context/MenuAvailabilityContext'
import { useSidebar } from '../../context/SidebarContext'
import { MENU_ITEMS, type MenuItem } from '../../constants/menu'
import StaffPageShell, { StaffMain } from '../../components/StaffPageShell'
import StaffHeader from '../../components/StaffHeader'
import ItemPhoto from '../../components/ItemPhoto'
import { photoFor, preparePhoto, removePhoto, resetPhoto, savePhoto, usePhotoOverrides } from '../../services/menuPhotos'
import {
  BottomSheet, Button, EmptyState, IconButton, Switch, TextInput, cn, fieldClasses,
} from '../../components/ui'
import { peso } from '../../utils/formatters'

type EditableItem = { name: string; price: string; category: string }
/** A photo change waiting for Save: a new photo, no photo (null), or back to the built-in one. */
type PhotoDraft = { src: string | null; reset?: boolean } | undefined
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
    resetPhotoForm()
    setEditing(item.id)
  }, [])

  const openAdd = useCallback(() => {
    setForm(EMPTY_FORM)
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

  const canSave = !!form.name.trim() && !!form.price && !photoBusy

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
    if (!canSave) return
    if (editing === 'new') {
      const newId = Math.max(0, ...items.map(i => i.id)) + 1
      if (!applyPhoto(newId)) return
      setItems(prev => [...prev, {
        id: newId, name: form.name,
        price: Number(form.price), category: form.category,
        description: '', available: true,
      }])
    } else if (editing !== null) {
      if (!applyPhoto(editing)) return
      setItems(prev => prev.map(item =>
        item.id === editing
          ? { ...item, name: form.name, price: Number(form.price), category: form.category }
          : item,
      ))
    }
    setEditing(null)
  }

  const remove = () => {
    if (typeof editing === 'number') {
      setItems(prev => prev.filter(item => item.id !== editing))
      // Don't leave its photo behind for a future item with the same number
      if (editing in overrides) resetPhoto(editing)
    }
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

      <StaffMain className="space-y-6">
        <p className="text-sm leading-relaxed text-ink-muted">
          Switch an item off when it runs out; guests see it as “Sold out today”. Photos are saved on this
          device. Name, price and new items are kept for this session only.
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
                      <ItemPhoto item={item} dimmed={!isAvailable} className="h-12 w-12 shrink-0 rounded-control border border-line" />
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-[15px] font-medium leading-snug', isAvailable ? 'text-ink' : 'text-ink-muted')}>{item.name}</p>
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
      </StaffMain>

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
