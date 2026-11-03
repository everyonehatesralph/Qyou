import { useOrders } from '../../context/OrderContext'
import type { Order } from '../../context/OrderContext'
import { useSidebar } from '../../context/SidebarContext'
import { useMemo, useState } from 'react'
import StaffPageShell, { StaffMain } from '../../components/StaffPageShell'
import StaffHeader from '../../components/StaffHeader'
import KpiCard from '../../components/KpiCard'
import TableCard from '../../components/TableCard'
import ConfirmDialog from '../../components/ConfirmDialog'
import { RESTAURANT, tableLabel } from '../../config/restaurant'

export default function TableAvailability() {
  const { orders, updateOrderStatus } = useOrders()
  const { expanded: sidebarExpanded, toggle: toggleSidebar } = useSidebar()
  const [freeTableId, setFreeTableId] = useState<number | null>(null)

  // Here (as at check-in) any order not yet paid keeps a table occupied
  const ordersByTable = useMemo(() => {
    const map = new Map<number, Order[]>()
    for (const o of orders) {
      if (o.status === 'paid') continue
      map.set(o.tableId, [...(map.get(o.tableId) ?? []), o])
    }
    return map
  }, [orders])

  const total = RESTAURANT.tables.length
  const occupied = RESTAURANT.tables.filter(t => ordersByTable.has(t.id)).length
  const freeCount = total - occupied

  // Unchanged behavior: freeing a table marks all its unpaid orders as paid
  const tableToFree = freeTableId === null ? [] : (ordersByTable.get(freeTableId) ?? [])
  const clearTable = () => {
    tableToFree.forEach(o => updateOrderStatus(o.id, 'paid'))
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

      <StaffMain className="space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Free" value={freeCount} />
          <KpiCard label="In use" value={occupied} group="progress" />
          <KpiCard label="Total" value={total} />
        </div>

        <p className="text-sm text-ink-muted">
          A table stays occupied until its orders are paid. Free it when the guests leave.
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
      </StaffMain>

      <ConfirmDialog
        open={freeTableId !== null}
        title={freeTableId !== null ? `Free ${tableLabel(freeTableId)}?` : ''}
        body={`This marks its ${tableToFree.length} open ${tableToFree.length === 1 ? 'order' : 'orders'} as paid so new guests can check in.`}
        confirmLabel="Free table"
        onConfirm={clearTable}
        onClose={() => setFreeTableId(null)}
      />
    </StaffPageShell>
  )
}
