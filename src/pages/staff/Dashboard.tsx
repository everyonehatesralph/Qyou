import {
  LayoutGrid, TrendingUp, TrendingDown, Coffee, Clock, CheckCircle,
  Bell, ChefHat, Volume2, Banknote, DollarSign, UtensilsCrossed
} from 'lucide-react'
import { useOrders } from '../../context/OrderContext'
import type { Order } from '../../context/OrderContext'
import { useOrderNotification } from '../../hooks/useOrderNotification'
import { useMemo, useCallback, memo } from 'react'
import StaffPageShell from '../../components/StaffPageShell'

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
  pending:   '#FBBF24',
  confirmed: '#60A5FA',
  preparing: '#C8860A',
  ready:     '#4ADE80',
  served:    '#9B8B7A',
  paid:      '#5C4F44',
}

const STATUS_LABEL: Record<string, string> = {
  pending:   'Awaiting',
  confirmed: 'Sent to Kitchen',
  preparing: 'In Preparation',
  ready:     'Ready to Serve',
  served:    'Served',
  paid:      'Paid ✓',
}

function elapsed(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  return `${Math.floor(secs / 60)}m ago`
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── Stat Card (Square UI pattern) ───────────────────────────────────────────
function StatCard({
  title, value, icon: Icon, trend, trendValue, color, glowColor,
}: {
  title: string
  value: number | string
  icon: typeof Bell
  trend?: 'up' | 'down'
  trendValue?: string
  color: string
  glowColor: string
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: '#171210', border: '1px solid #2E2318' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium" style={{ color: '#9B8B7A' }}>{title}</span>
        <Icon className="w-4 h-4" style={{ color: '#5C4F44' }} />
      </div>
      <div
        className="rounded-lg p-4 flex items-center justify-between"
        style={{ backgroundColor: '#0D0B0A', border: '1px solid #2E2318' }}
      >
        <span
          className="text-2xl sm:text-3xl font-medium tracking-tight"
          style={{ color }}
        >
          {value}
        </span>
        {trend && trendValue && (
          <div className="flex items-center gap-3">
            <div className="h-9 w-px" style={{ backgroundColor: '#2E2318' }} />
            <div
              className="flex items-center gap-1.5"
              style={{
                color: trend === 'up' ? '#4ADE80' : '#F87171',
                textShadow: `0 1px 6px ${glowColor}`,
              }}
            >
              {trend === 'up'
                ? <TrendingUp className="w-3.5 h-3.5" />
                : <TrendingDown className="w-3.5 h-3.5" />
              }
              <span className="text-sm font-medium">{trendValue}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Pending Order Card ──────────────────────────────────────────────────────
const PendingCard = memo(function PendingCard({
  order,
  onConfirm,
}: {
  order: Order
  onConfirm: (id: string) => void
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: '#171210', border: '1.5px solid rgba(251,191,36,0.35)' }}
    >
      {/* Card header */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: '#F0E6D3' }}>
              #{order.id}
            </span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse"
              style={{ backgroundColor: 'rgba(251,191,36,0.15)', color: '#FBBF24' }}
            >
              NEW
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: '#9B8B7A' }}>
            {order.tableName} · {order.customerName}
          </p>
        </div>
        <div className="text-right">
          <span className="font-semibold text-sm" style={{ color: '#C8860A' }}>
            ₱{order.total.toFixed(0)}
          </span>
          <p className="text-[10px] flex items-center gap-1 justify-end mt-0.5" style={{ color: '#5C4F44' }}>
            <Clock className="w-3 h-3" />
            {elapsed(order.createdAt)}
          </p>
        </div>
      </div>

      {/* Items panel (inner muted bg — Square UI pattern) */}
      <div
        className="mx-3 mb-3 rounded-lg p-3 space-y-1.5"
        style={{ backgroundColor: '#0D0B0A', border: '1px solid #2E2318' }}
      >
        {order.items.map(item => (
          <div key={item.id} className="flex justify-between items-center text-sm">
            <span style={{ color: '#F0E6D3' }}>{item.name}</span>
            <span style={{ color: '#5C4F44' }}>×{item.quantity}</span>
          </div>
        ))}
        {order.notes && (
          <div
            className="pt-2 mt-1 text-xs"
            style={{ borderTop: '1px dashed #2E2318', color: '#9B8B7A' }}
          >
            📝 {order.notes}
          </div>
        )}
      </div>

      {/* Confirm button */}
      <div className="px-3 pb-3">
        <button
          onClick={() => onConfirm(order.id)}
          className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
          style={{ backgroundColor: 'rgba(96,165,250,0.15)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.3)' }}
        >
          <CheckCircle className="w-4 h-4" />
          Confirm & Send to Kitchen
        </button>
      </div>
    </div>
  )
})

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, badge, badgeColor }: {
  icon: typeof Bell
  title: string
  badge?: number
  badgeColor?: string
}) {
  return (
    <div
      className="flex items-center justify-between py-3 px-4 rounded-t-xl"
      style={{ backgroundColor: '#171210', borderBottom: '1px solid #2E2318' }}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: '#5C4F44' }} />
        <h3 className="text-sm font-medium" style={{ color: '#F0E6D3' }}>{title}</h3>
      </div>
      {badge !== undefined && badge > 0 && (
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: `${badgeColor}20`,
            color: badgeColor,
            border: `1px solid ${badgeColor}40`,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { orders, updateOrderStatus, isConnected } = useOrders()

  useOrderNotification(orders, o => o.status === 'pending')

  const pendingOrders = useMemo(
    () => orders.filter(o => o.status === 'pending'),
    [orders]
  )
  const activeOrders = useMemo(
    () => orders.filter(o => !['served', 'paid', 'pending', 'cancelled'].includes(o.status)),
    [orders]
  )
  const servedOrders = useMemo(
    () => orders.filter(o => o.status === 'served'),
    [orders]
  )
  const inKitchenCount = useMemo(
    () => orders.filter(o => o.status === 'confirmed' || o.status === 'preparing').length,
    [orders]
  )
  const readyCount = useMemo(
    () => orders.filter(o => o.status === 'ready').length,
    [orders]
  )
  const todayRevenue = useMemo(() => {
    const today = new Date().toDateString()
    return orders
      .filter(o => o.status === 'paid' && new Date(o.createdAt).toDateString() === today)
      .reduce((s, o) => s + o.total, 0)
  }, [orders])

  const occupiedTableIds = useMemo(
    () => new Set(orders.filter(o => o.status !== 'paid' && o.status !== 'cancelled').map(o => o.tableId)),
    [orders]
  )

  const confirmOrder = useCallback((orderId: string) => {
    updateOrderStatus(orderId, 'confirmed')
  }, [updateOrderStatus])

  const markPaid = useCallback((orderId: string) => {
    updateOrderStatus(orderId, 'paid')
  }, [updateOrderStatus])

  const clearTable = useCallback((tableId: number) => {
    orders
      .filter(o => o.tableId === tableId && o.status !== 'paid')
      .forEach(o => updateOrderStatus(o.id, 'paid'))
  }, [orders, updateOrderStatus])

  return (
    <StaffPageShell>
      {/* Top header bar (Square UI pattern) */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between gap-4 px-4 sm:px-6 py-3"
        style={{ backgroundColor: '#171210', borderBottom: '1px solid #2E2318' }}
      >
        <div className="flex items-center gap-2" style={{ color: '#5C4F44' }}>
          <LayoutGrid className="w-4 h-4" />
          <span className="text-sm font-medium">Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: isConnected ? '#4ADE80' : '#F87171' }}
            />
            <span style={{ color: '#9B8B7A' }}>{isConnected ? 'Live' : 'Offline'}</span>
          </span>
          <div className="h-4 w-px" style={{ backgroundColor: '#2E2318' }} />
          <span className="flex items-center gap-1 text-xs" style={{ color: '#5C4F44' }}>
            <Volume2 className="w-3.5 h-3.5" /> Alerts
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8">
        {/* Welcome section (Square UI pattern) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" style={{ color: '#F0E6D3' }}>
              {getGreeting()}, Staff!
            </h1>
            <p className="text-sm mt-0.5" style={{ color: '#9B8B7A' }}>
              Here's what's happening at the cafe today
            </p>
          </div>
        </div>

        {/* Stats Cards (Square UI inner-panel pattern) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Awaiting Confirmation"
            value={pendingOrders.length}
            icon={Bell}
            color="#FBBF24"
            glowColor="rgba(251,191,36,0.25)"
            trend={pendingOrders.length > 0 ? 'up' : undefined}
            trendValue={pendingOrders.length > 0 ? 'New' : undefined}
          />
          <StatCard
            title="In Kitchen"
            value={inKitchenCount}
            icon={ChefHat}
            color="#C8860A"
            glowColor="rgba(200,134,10,0.25)"
          />
          <StatCard
            title="Ready to Serve"
            value={readyCount}
            icon={Coffee}
            color="#4ADE80"
            glowColor="rgba(74,222,128,0.25)"
            trend={readyCount > 0 ? 'up' : undefined}
            trendValue={readyCount > 0 ? 'Pickup' : undefined}
          />
          <StatCard
            title="Today's Revenue"
            value={`₱${todayRevenue.toFixed(0)}`}
            icon={DollarSign}
            color="#F0E6D3"
            glowColor="rgba(200,134,10,0.25)"
          />
        </div>

        {/* Incoming Orders */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid #2E2318' }}
        >
          <SectionHeader
            icon={Bell}
            title="Incoming Orders"
            badge={pendingOrders.length}
            badgeColor="#FBBF24"
          />
          <div className="p-4" style={{ backgroundColor: '#0D0B0A' }}>
            {pendingOrders.length === 0 ? (
              <div className="py-10 text-center">
                <Coffee className="w-10 h-10 mx-auto mb-2" style={{ color: '#2E2318' }} />
                <p className="text-sm" style={{ color: '#5C4F44' }}>No pending orders</p>
                <p className="text-xs mt-1" style={{ color: '#3D3028' }}>
                  New customer orders will appear here for confirmation.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingOrders.map(order => (
                  <PendingCard key={order.id} order={order} onConfirm={confirmOrder} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid #2E2318' }}
          >
            <SectionHeader
              icon={TrendingUp}
              title="Active Orders"
              badge={activeOrders.length}
              badgeColor="#C8860A"
            />
            <div className="divide-y" style={{ backgroundColor: '#0D0B0A', borderColor: '#2E2318' }}>
              {activeOrders.map(order => (
                <div
                  key={order.id}
                  className="flex items-center gap-4 px-4 py-3 transition-colors"
                  style={{ borderColor: '#1A1412' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium" style={{ color: '#F0E6D3' }}>
                        #{order.id}
                      </span>
                      <span style={{ color: '#2E2318' }}>·</span>
                      <span className="text-xs" style={{ color: '#9B8B7A' }}>
                        {order.tableName}
                      </span>
                      <span style={{ color: '#2E2318' }}>·</span>
                      <span className="text-xs" style={{ color: '#9B8B7A' }}>
                        {order.customerName}
                      </span>
                    </div>
                    <p className="text-xs truncate" style={{ color: '#5C4F44' }}>
                      {order.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 flex items-center gap-3">
                    <div className="h-8 w-px" style={{ backgroundColor: '#2E2318' }} />
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#C8860A' }}>
                        ₱{order.total.toFixed(0)}
                      </p>
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: STATUS_COLOR[order.status] }}
                      >
                        {STATUS_LABEL[order.status]}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Served Orders (awaiting payment) */}
        {servedOrders.length > 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid #2E2318' }}
          >
            <SectionHeader
              icon={Banknote}
              title="Awaiting Payment"
              badge={servedOrders.length}
              badgeColor="#4ADE80"
            />
            <div className="divide-y" style={{ backgroundColor: '#0D0B0A', borderColor: '#2E2318' }}>
              {servedOrders.map(order => (
                <div
                  key={order.id}
                  className="flex items-center gap-4 px-4 py-3"
                  style={{ borderColor: '#1A1412' }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium" style={{ color: '#F0E6D3' }}>
                        #{order.id}
                      </span>
                      <span style={{ color: '#2E2318' }}>·</span>
                      <span className="text-xs" style={{ color: '#9B8B7A' }}>
                        {order.tableName} · {order.customerName}
                      </span>
                    </div>
                    <p className="text-xs truncate" style={{ color: '#5C4F44' }}>
                      {order.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="font-semibold text-sm" style={{ color: '#C8860A' }}>
                      ₱{order.total.toFixed(0)}
                    </p>
                    <button
                      onClick={() => markPaid(order.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
                      style={{
                        backgroundColor: 'rgba(74,222,128,0.1)',
                        color: '#4ADE80',
                        border: '1px solid rgba(74,222,128,0.3)',
                      }}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      Paid
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table Availability */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid #2E2318' }}
        >
          <div
            className="flex items-center justify-between py-3 px-4"
            style={{ backgroundColor: '#171210', borderBottom: '1px solid #2E2318' }}
          >
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4" style={{ color: '#5C4F44' }} />
              <h3 className="text-sm font-medium" style={{ color: '#F0E6D3' }}>
                Table Availability
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span style={{ color: '#4ADE80' }}>{TABLES.length - occupiedTableIds.size} free</span>
              <span style={{ color: '#2E2318' }}>/</span>
              <span style={{ color: '#5C4F44' }}>{TABLES.length} total</span>
            </div>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" style={{ backgroundColor: '#0D0B0A' }}>
            {TABLES.map(table => {
              const occupied = occupiedTableIds.has(table.id)
              const tableOrders = orders.filter(o => o.tableId === table.id && o.status !== 'paid' && o.status !== 'cancelled')
              const allServed = tableOrders.length > 0 && tableOrders.every(o => o.status === 'served')
              const totalSpent = tableOrders.reduce((s, o) => s + o.total, 0)

              return (
                <div
                  key={table.id}
                  className="rounded-xl p-3.5 transition-all"
                  style={{
                    backgroundColor: '#171210',
                    border: occupied
                      ? allServed ? '1px solid rgba(74,222,128,0.35)' : '1px solid rgba(200,134,10,0.3)'
                      : '1px solid #2E2318',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm" style={{ color: '#F0E6D3' }}>
                      {table.name}
                    </p>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: occupied ? '#C8860A' : '#4ADE80' }}
                    />
                  </div>

                  {tableOrders.length > 0 ? (
                    <div
                      className="rounded-lg p-2.5 mb-2.5 space-y-1.5"
                      style={{ backgroundColor: '#0D0B0A', border: '1px solid #2E2318' }}
                    >
                      {tableOrders.map(o => (
                        <div key={o.id} className="flex items-center justify-between text-[10px]">
                          <span style={{ color: '#9B8B7A' }}>{o.customerName}</span>
                          <span style={{ color: STATUS_COLOR[o.status] }}>
                            {STATUS_LABEL[o.status]}
                          </span>
                        </div>
                      ))}
                      {totalSpent > 0 && (
                        <div
                          className="flex items-center justify-between text-[10px] pt-1.5"
                          style={{ borderTop: '1px dashed #2E2318' }}
                        >
                          <span style={{ color: '#5C4F44' }}>Total</span>
                          <span className="font-bold" style={{ color: '#C8860A' }}>₱{totalSpent.toFixed(0)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-2 text-center">
                      <span className="text-[10px]" style={{ color: '#3D3028' }}>Available</span>
                    </div>
                  )}

                  {occupied && (
                    <div className="space-y-1.5">
                      {allServed && (
                        <button
                          onClick={() => clearTable(table.id)}
                          className="w-full py-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all active:scale-95"
                          style={{ backgroundColor: 'rgba(74,222,128,0.1)', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.25)' }}
                        >
                          <Banknote className="w-3 h-3" />
                          Clear — Paid
                        </button>
                      )}
                      <button
                        onClick={() => clearTable(table.id)}
                        className="w-full py-1.5 rounded-lg text-[10px] font-medium flex items-center justify-center transition-all active:scale-95"
                        style={{ color: '#5C4F44' }}
                      >
                        Free Table
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </StaffPageShell>
  )
}
