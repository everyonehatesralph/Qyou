import { useOrders } from '../../context/OrderContext'
import { useSidebar } from '../../context/SidebarContext'
import { useMemo, useState } from 'react'
import StaffPageShell from '../../components/StaffPageShell'
import StaffHeader from '../../components/StaffHeader'
import KpiCard from '../../components/KpiCard'
import TableCard, { settleSummary } from '../../components/TableCard'
import ConfirmDialog from '../../components/ConfirmDialog'
import { RESTAURANT, tableLabel } from '../../config/restaurant'
import { openOrdersByTable, settleTable } from '../../services/orderModel'

export default function TableAvailability() {
  const { orders, updateOrderStatus } = useOrders()
  const { expanded: sidebarExpanded, toggle: toggleSidebar } = useSidebar()
  const [freeTableId, setFreeTableId] = useState<number | null>(null)

  // A table is occupied by its unpaid, uncancelled orders (the same rule everywhere)
  const ordersByTable = useMemo(() => openOrdersByTable(orders), [orders])

  const total = RESTAURANT.tables.length
  const occupied = RESTAURANT.tables.filter(t => ordersByTable.has(t.id)).length
  const freeCount = total - occupied

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
          {RESTAURANT.tables.map(table => (
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
    </StaffPageShell>
  )
}
