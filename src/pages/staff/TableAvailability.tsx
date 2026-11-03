import { useOrders } from '../../context/OrderContext'
import { useSidebar } from '../../context/SidebarContext'
import { useMemo, useState } from 'react'
import { Pencil } from 'lucide-react'
import StaffPageShell from '../../components/StaffPageShell'
import StaffHeader from '../../components/StaffHeader'
import KpiCard from '../../components/KpiCard'
import TableCard, { settleSummary } from '../../components/TableCard'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useTables } from '../../context/TablesContext'
import { MAX_TABLES, openOrdersByTable, settleTable } from '../../services/orderModel'
import { BottomSheet, Button, QuantityStepper } from '../../components/ui'

export default function TableAvailability() {
  const { orders, updateOrderStatus } = useOrders()
  const { expanded: sidebarExpanded, toggle: toggleSidebar } = useSidebar()
  const { tables, label: tableLabel, setTableCount } = useTables()
  const [freeTableId, setFreeTableId] = useState<number | null>(null)
  // null = sheet closed; otherwise the count being edited
  const [editCount, setEditCount] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // A table is occupied by its unpaid, uncancelled orders (the same rule everywhere)
  const ordersByTable = useMemo(() => openOrdersByTable(orders), [orders])

  const total = tables.length
  const occupied = tables.filter(t => ordersByTable.has(t.id)).length
  const freeCount = total - occupied

  const openEdit = () => { setEditError(''); setEditCount(total) }
  const saveCount = async () => {
    if (editCount === null) return
    setSaving(true)
    setEditError('')
    try {
      await setTableCount(editCount)
      setEditCount(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  // Freeing a table: what was served is paid, what the kitchen hasn't finished is cancelled
  const settle = settleTable(freeTableId === null ? [] : ordersByTable.get(freeTableId) ?? [])
  const clearTable = () => {
    settle.pay.forEach(o => updateOrderStatus(o.id, 'paid'))
    settle.cancel.forEach(o => updateOrderStatus(o.id, 'cancelled'))
    setFreeTableId(null)
  }

  return (
    <StaffPageShell>
      <StaffHeader
        title="Tables"
        subtitle={`${freeCount} of ${total} free`}
        actions={<Button leftIcon={<Pencil />} onClick={openEdit}>Edit tables</Button>}
        sidebarExpanded={sidebarExpanded}
        onSidebarToggle={toggleSidebar}
      />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Free" value={freeCount} />
          <KpiCard label="In use" value={occupied} group="progress" />
          <KpiCard label="Total" value={total} />
        </div>

        <p className="text-sm text-ink-muted">
          A table stays occupied until its orders are paid or cancelled. Free it when the guests leave.
        </p>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {tables.map(table => (
            <TableCard
              key={table.id}
              label={table.label}
              orders={ordersByTable.get(table.id) ?? []}
              onFree={() => setFreeTableId(table.id)}
            />
          ))}
        </div>
      </main>

      <ConfirmDialog
        open={freeTableId !== null}
        title={freeTableId !== null ? `Free ${tableLabel(freeTableId)}?` : ''}
        body={settleSummary(settle)}
        confirmLabel="Free table"
        onConfirm={clearTable}
        onClose={() => setFreeTableId(null)}
      />

      <BottomSheet
        open={editCount !== null}
        onClose={() => { if (!saving) setEditCount(null) }}
        title="Edit tables"
        description="How many tables guests can check in at."
        footer={
          <Button variant="primary" size="lg" fullWidth onClick={saveCount} disabled={saving || editCount === total}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        }
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-ink">Number of tables</p>
            <p className="text-sm text-ink-muted">Numbered 1 to {editCount ?? total}</p>
          </div>
          <QuantityStepper
            value={editCount ?? total}
            min={1}
            max={MAX_TABLES}
            itemName="table"
            onChange={n => { setEditError(''); setEditCount(n) }}
          />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-ink-muted">
          New tables get a QR code on the QR codes screen; print it before guests sit there. A table with
          open orders can't be removed until you free it.
        </p>
        {editError && <p role="alert" className="mt-3 text-sm text-status-cancelled-text">{editError}</p>}
      </BottomSheet>
    </StaffPageShell>
  )
}
