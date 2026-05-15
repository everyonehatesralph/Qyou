import { MapPin, CheckCircle, Lock, Banknote, Users } from 'lucide-react'
import { useOrders } from '../../context/OrderContext'
import { useMemo, useCallback } from 'react'

const TABLES = [
  { id: 1, name: 'Table 1' },
  { id: 2, name: 'Table 2' },
  { id: 3, name: 'Table 3' },
  { id: 4, name: 'Table 4' },
  { id: 5, name: 'Table 5' },
  { id: 6, name: 'Table 6' },
  { id: 7, name: 'Table 7' },
  { id: 8, name: 'Table 8' },
  { id: 9, name: 'Table 9' },
  { id: 10, name: 'Table 10' },
]

const STATUS_COLOR: Record<string, string> = {
  pending: '#FBBF24', confirmed: '#60A5FA', preparing: '#C8860A',
  ready: '#4ADE80', served: '#9B8B7A', paid: '#5C4F44',
}

export default function TableAvailability() {
  const { orders, updateOrderStatus } = useOrders()

  const occupiedTableIds = useMemo(
    () => new Set(orders.filter(o => o.status !== 'paid').map(o => o.tableId)),
    [orders]
  )
  const freeCount = TABLES.length - occupiedTableIds.size

  const clearTable = useCallback((tableId: number) => {
    orders
      .filter(o => o.tableId === tableId && o.status !== 'paid')
      .forEach(o => updateOrderStatus(o.id, 'paid'))
  }, [orders, updateOrderStatus])

  return (
    <div className="min-h-screen bg-background md:ml-56 pt-4 md:pt-6">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <MapPin className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-text-base">Table Availability</h1>
        </div>
        <p className="text-text-muted text-sm mb-6">
          Manage table occupancy. Free tables become available for new customers.
        </p>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.25)' }}>
            <p className="text-text-muted text-xs mb-1">Available</p>
            <p className="text-2xl font-bold" style={{ color: '#4ADE80' }}>{freeCount}</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(200,134,10,0.06)', border: '1px solid rgba(200,134,10,0.25)' }}>
            <p className="text-text-muted text-xs mb-1">Occupied</p>
            <p className="text-2xl font-bold" style={{ color: '#C8860A' }}>{occupiedTableIds.size}</p>
          </div>
          <div className="rounded-xl p-4 col-span-2 sm:col-span-1" style={{ backgroundColor: '#171210', border: '1px solid #2E2318' }}>
            <p className="text-text-muted text-xs mb-1">Total Tables</p>
            <p className="text-2xl font-bold text-text-base">{TABLES.length}</p>
          </div>
        </div>

        {/* Table grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TABLES.map(table => {
            const occupied = occupiedTableIds.has(table.id)
            const tableOrders = orders.filter(o => o.tableId === table.id && o.status !== 'paid')
            const allServed = tableOrders.length > 0 && tableOrders.every(o => o.status === 'served')
            const totalSpent = tableOrders.reduce((s, o) => s + o.total, 0)

            return (
              <div
                key={table.id}
                className="rounded-xl p-5 transition-all"
                style={{
                  backgroundColor: occupied ? 'rgba(200,134,10,0.04)' : '#171210',
                  border: occupied
                    ? allServed ? '1.5px solid rgba(74,222,128,0.4)' : '1.5px solid rgba(200,134,10,0.35)'
                    : '1.5px solid #2E2318',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: occupied ? 'rgba(200,134,10,0.12)' : 'rgba(74,222,128,0.1)',
                        border: `1px solid ${occupied ? 'rgba(200,134,10,0.25)' : 'rgba(74,222,128,0.2)'}`,
                      }}
                    >
                      {occupied
                        ? <Lock className="w-4 h-4" style={{ color: '#C8860A' }} />
                        : <CheckCircle className="w-4 h-4" style={{ color: '#4ADE80' }} />
                      }
                    </div>
                    <div>
                      <p className="font-bold text-text-base text-sm">{table.name}</p>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={occupied
                      ? { backgroundColor: 'rgba(200,134,10,0.15)', color: '#C8860A', border: '1px solid rgba(200,134,10,0.3)' }
                      : { backgroundColor: 'rgba(74,222,128,0.1)', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.25)' }
                    }
                  >
                    {occupied ? 'OCCUPIED' : 'AVAILABLE'}
                  </span>
                </div>

                {/* Orders at this table */}
                {tableOrders.length > 0 ? (
                  <div
                    className="rounded-lg p-3 mb-3 space-y-2"
                    style={{ backgroundColor: 'rgba(13,11,10,0.3)', border: '1px solid #2E2318' }}
                  >
                    {tableOrders.map(o => (
                      <div key={o.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Users className="w-3 h-3 text-text-faint flex-shrink-0" />
                          <span className="text-text-muted font-mono">#{o.id}</span>
                          <span className="text-text-muted truncate">{o.customerName}</span>
                        </div>
                        <span className="font-semibold flex-shrink-0" style={{ color: STATUS_COLOR[o.status] || '#9B8B7A' }}>
                          {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                        </span>
                      </div>
                    ))}
                    {totalSpent > 0 && (
                      <div className="flex items-center justify-between text-xs pt-2" style={{ borderTop: '1px dashed rgba(255,255,255,0.06)' }}>
                        <span className="text-text-faint">Bill Total</span>
                        <span className="font-bold" style={{ color: '#C8860A' }}>₱{totalSpent.toFixed(0)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg p-4 mb-3 text-center" style={{ backgroundColor: 'rgba(74,222,128,0.03)', border: '1px dashed rgba(74,222,128,0.2)' }}>
                    <p className="text-text-faint text-xs">Ready for customers</p>
                  </div>
                )}

                {/* Actions */}
                {occupied && (
                  <div className="space-y-2">
                    {allServed && (
                      <button
                        onClick={() => clearTable(table.id)}
                        className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                        style={{ backgroundColor: '#4ADE80', color: '#0D0B0A' }}
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        Clear — Already Paid
                      </button>
                    )}
                    <button
                      onClick={() => clearTable(table.id)}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      style={{ backgroundColor: 'transparent', color: '#F87171', border: '1px solid rgba(248,113,113,0.3)' }}
                    >
                      Free Table — Customer Left
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
