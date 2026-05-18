import { Settings, Plus, Edit, Trash, X, Check, ToggleLeft, ToggleRight } from 'lucide-react'
import { useState, useCallback } from 'react'
import { useMenuAvailability } from '../../context/MenuAvailabilityContext'
import { useSidebar } from '../../context/SidebarContext'
import { MENU_ITEMS } from '../../constants/menu'
import StaffPageShell from '../../components/StaffPageShell'
import StaffHeader from '../../components/StaffHeader'

type EditableItem = { name: string; price: string; category: string }
export default function MenuManagement() {
  const { itemAvailability, toggleItemAvailability } = useMenuAvailability()
  const { expanded: sidebarExpanded, toggle: toggleSidebar } = useSidebar()
  const [items, setItems]           = useState(MENU_ITEMS)
  const [editingId, setEditingId]   = useState<number | null>(null)
  const [editForm, setEditForm]     = useState<EditableItem>({ name: '', price: '', category: '' })
  const [showAdd, setShowAdd]       = useState(false)
  const [addForm, setAddForm]       = useState<EditableItem>({ name: '', price: '', category: 'Coffee' })
  const startEdit = useCallback((item: (typeof MENU_ITEMS)[0]) => {
    setEditingId(item.id)
    setEditForm({ name: item.name, price: String(item.price), category: item.category })
  }, [])
  const saveEdit = useCallback(() => {
    if (!editForm.name.trim() || !editForm.price) return
    setItems(prev =>
      prev.map(item =>
        item.id === editingId
          ? { ...item, name: editForm.name, price: Number(editForm.price), category: editForm.category }
          : item
      )
    )
    setEditingId(null)
  }, [editingId, editForm])
  const deleteItem = useCallback((id: number) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }, [])
  const addItem = useCallback(() => {
    if (!addForm.name.trim() || !addForm.price) return
    const newId = Math.max(0, ...items.map(i => i.id)) + 1
    setItems(prev => [...prev, {
      id: newId, name: addForm.name,
      price: Number(addForm.price), category: addForm.category,
      description: '', available: true,
    }])
    setAddForm({ name: '', price: '', category: 'Coffee' })
    setShowAdd(false)
  }, [addForm, items])
  const categories = ['Coffee', 'Tea', 'Pastry', 'Food']
  return (
    <StaffPageShell>
      <StaffHeader
        icon={Settings}
        title="Menu Management"
        actions={
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-sm font-medium transition-all"
            style={showAdd
              ? { backgroundColor: 'rgba(248,113,113,0.08)', color: '#F87171', border: '1px solid rgba(248,113,113,0.2)' }
              : { color: '#9B8B7A', border: '1px solid #2E2318' }
            }
          >
            {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span className="text-sm">{showAdd ? 'Cancel' : 'Add Item'}</span>
          </button>
        }
        sidebarExpanded={sidebarExpanded}
        onSidebarToggle={toggleSidebar}
      />

      <main className="flex-1 overflow-auto p-4 sm:p-6 space-y-6 pb-24 md:pb-8">
        <p className="text-sm" style={{ color: '#9B8B7A' }}>
          Toggle items on/off for today's service. Changes are visible to customers immediately.
        </p>
        {/* Add Item Form */}
        {showAdd && (
          <div
            className="rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3"
            style={{ backgroundColor: 'rgba(200,134,10,0.08)', border: '1px solid rgba(200,134,10,0.3)' }}
          >
            <input
              type="text"
              placeholder="Item name"
              value={addForm.name}
              onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
              className="flex-1"
            />
            <input
              type="number"
              placeholder="Price (₱)"
              step="1"
              value={addForm.price}
              onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))}
              className="w-full sm:w-32"
            />
            <select
              value={addForm.category}
              onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
              className="w-full sm:w-36"
            >
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            <button
              onClick={addItem}
              disabled={!addForm.name.trim() || !addForm.price}
              className="btn-primary px-4 py-2.5 rounded-lg text-sm font-semibold text-background disabled:opacity-40 flex items-center justify-center gap-1 flex-shrink-0"
            >
              <Check className="w-4 h-4" /> Add
            </button>
          </div>
        )}
        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2E2318' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #2E2318' }}>
                  {['Item', 'Category', 'Price', 'Available Today', 'Actions'].map((h, i) => (
                    <th
                      key={h}
                      className={`py-3 px-4 text-xs font-semibold uppercase tracking-wide text-text-muted ${i >= 3 ? 'text-center' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const isAvailable = itemAvailability[item.id] !== false
                  return (
                    <tr
                      key={item.id}
                      className="transition-colors"
                      style={{ borderBottom: '1px solid #2E2318' }}
                    >
                      {editingId === item.id ? (
                        /* ── Edit row ── */
                        <>
                          <td className="py-2 px-4">
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                              className="py-1.5"
                            />
                          </td>
                          <td className="py-2 px-4">
                            <select
                              value={editForm.category}
                              onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                              className="py-1.5"
                            >
                              {categories.map(c => <option key={c}>{c}</option>)}
                            </select>
                          </td>
                          <td className="py-2 px-4">
                            <input
                              type="number"
                              value={editForm.price}
                              onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                              className="w-24 py-1.5"
                            />
                          </td>
                          <td className="py-2 px-4 text-center">—</td>
                          <td className="py-2 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={saveEdit}
                                className="p-2 rounded-lg transition-colors"
                                style={{ color: '#4ADE80' }}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-2 rounded-lg transition-colors text-text-muted hover:text-text-base"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        /* ── Display row ── */
                        <>
                          <td className="py-3.5 px-4">
                            <p className={`text-sm font-medium ${isAvailable ? 'text-text-base' : 'text-text-faint line-through'}`}>
                              {item.name}
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className="badge text-xs"
                              style={{ backgroundColor: 'rgba(232,201,122,0.08)', color: '#9B8B7A', border: '1px solid rgba(232,201,122,0.15)' }}
                            >
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-sm text-primary">
                            ₱{item.price}
                          </td>
                          {/* Availability toggle */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => toggleItemAvailability(item.id)}
                              className="flex items-center justify-center gap-1.5 mx-auto transition-all active:scale-95"
                              title={isAvailable ? 'Click to mark as sold out' : 'Click to make available'}
                            >
                              {isAvailable ? (
                                <>
                                  <ToggleRight className="w-6 h-6" style={{ color: '#4ADE80' }} />
                                  <span className="text-xs font-semibold" style={{ color: '#4ADE80' }}>Available</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="w-6 h-6 text-text-faint" />
                                  <span className="text-xs font-semibold text-text-faint">Sold Out</span>
                                </>
                              )}
                            </button>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => startEdit(item)}
                                className="p-2 rounded-lg transition-colors"
                                style={{ color: '#60A5FA' }}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteItem(item.id)}
                                className="p-2 rounded-lg transition-colors"
                                style={{ color: '#F87171' }}
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-text-muted text-sm">
                      No menu items. Click "Add Item" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <ToggleRight className="w-5 h-5" style={{ color: '#4ADE80' }} />
            <span className="text-text-muted text-xs">Item is available for ordering</span>
          </div>
          <div className="flex items-center gap-2">
            <ToggleLeft className="w-5 h-5 text-text-faint" />
            <span className="text-text-muted text-xs">Item hidden from customer menu</span>
          </div>
        </div>
      </main>
    </StaffPageShell>
  )
}