import { useEffect, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import type { LiveOptionGroup, OptionGroupSave } from '../services/orderSync'
import { BottomSheet, Button, IconButton, Switch, TextInput } from './ui'

interface Props {
  /** The group being edited, 'new' to add one, null when closed. */
  group: LiveOptionGroup | 'new' | null
  onClose: () => void
  onSave: (group: OptionGroupSave) => Promise<void>
  onRemove: (id: number) => Promise<void>
}

type Row = { id?: number; name: string; price: string; key: number }

let rowKey = 0
const NEW_ROWS = (): Row[] => [{ name: '', price: '0', key: ++rowKey }]

/** Staff: an option group's name, whether guests must choose and can pick several, and its choices. */
export default function OptionGroupEditor({ group, onClose, onSave, onRemove }: Props) {
  const [name, setName] = useState('')
  const [required, setRequired] = useState(true)
  const [multiple, setMultiple] = useState(false)
  const [rows, setRows] = useState<Row[]>(NEW_ROWS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (group === null) return
    setError('')
    if (group === 'new') {
      setName(''); setRequired(true); setMultiple(false); setRows(NEW_ROWS())
    } else {
      setName(group.name); setRequired(group.required); setMultiple(group.multiple)
      setRows(group.choices.map(c => ({ id: c.id, name: c.name, price: String(c.price), key: ++rowKey })))
    }
  }, [group])

  const setRow = (key: number, change: Partial<Row>) => setRows(prev => prev.map(r => (r.key === key ? { ...r, ...change } : r)))
  const canSave = !saving && name.trim() !== '' && rows.length > 0 && rows.every(r => r.name.trim() !== '' && r.price.trim() !== '')

  const run = async (write: () => Promise<void>) => {
    setSaving(true)
    setError('')
    try {
      await write()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const save = () => run(() => onSave({
    ...(group !== 'new' && group ? { id: group.id } : {}),
    name: name.trim(),
    required,
    multiple,
    choices: rows.map(r => ({ ...(r.id !== undefined ? { id: r.id } : {}), name: r.name.trim(), price: Number(r.price) })),
  }))

  return (
    <BottomSheet
      open={group !== null}
      onClose={() => { if (!saving) onClose() }}
      title={group === 'new' ? 'New option group' : 'Edit option group'}
      description="Choices guests make for an item, like size or sugar level."
      footer={
        <div className="flex gap-3">
          {group !== 'new' && group && (
            <Button variant="danger" leftIcon={<Trash2 />} onClick={() => run(() => onRemove(group.id))} disabled={saving}>
              Delete
            </Button>
          )}
          <Button variant="primary" size="lg" onClick={save} disabled={!canSave} className="flex-1">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <TextInput label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Milk" maxLength={40} />

        <div className="divide-y divide-line rounded-card border border-line">
          <div className="flex items-center justify-between gap-3 py-1 pl-4 pr-2">
            <div>
              <p className="text-[15px] font-medium text-ink">Guests must choose</p>
              <p className="text-[13px] text-ink-muted">Off: they can skip it.</p>
            </div>
            <Switch checked={required} onChange={setRequired} label="Guests must choose" />
          </div>
          <div className="flex items-center justify-between gap-3 py-1 pl-4 pr-2">
            <div>
              <p className="text-[15px] font-medium text-ink">More than one</p>
              <p className="text-[13px] text-ink-muted">Guests can pick several, like toppings.</p>
            </div>
            <Switch checked={multiple} onChange={setMultiple} label="Guests can pick more than one" />
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">Choices</legend>
          <ul className="space-y-2">
            {rows.map((r, i) => (
              <li key={r.key} className="flex items-end gap-2">
                <TextInput
                  label={`Choice ${i + 1}`}
                  hideLabel={i > 0}
                  value={r.name}
                  onChange={e => setRow(r.key, { name: e.target.value })}
                  placeholder="e.g. Oat milk"
                  maxLength={40}
                  className="min-w-0 flex-1"
                />
                <TextInput
                  label={`Choice ${i + 1} extra price (₱)`}
                  hideLabel={i > 0}
                  inputMode="decimal"
                  type="number"
                  min={0}
                  step="any"
                  value={r.price}
                  onChange={e => setRow(r.key, { price: e.target.value })}
                  className="w-28 shrink-0"
                />
                <IconButton
                  label={`Remove ${r.name.trim() || `choice ${i + 1}`}`}
                  onClick={() => setRows(prev => prev.filter(x => x.key !== r.key))}
                  disabled={rows.length === 1}
                  className="shrink-0 text-ink-muted"
                >
                  <X />
                </IconButton>
              </li>
            ))}
          </ul>
          <Button
            variant="ghost"
            leftIcon={<Plus />}
            onClick={() => setRows(prev => [...prev, { name: '', price: '0', key: ++rowKey }])}
            disabled={rows.length >= 20}
            className="-ml-3 mt-2"
          >
            Add choice
          </Button>
        </fieldset>
        <p className="text-[13px] leading-relaxed text-ink-muted">
          The extra price is added to the item's price. Orders already placed keep the price they had.
        </p>
        {error && <p role="alert" className="text-sm text-status-cancelled-text">{error}</p>}
      </div>
    </BottomSheet>
  )
}
