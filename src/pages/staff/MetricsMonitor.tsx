import { useEffect, useState } from 'react'
import { metricsCollector, type MetricsSnapshot } from '../../services/metricsCollector'
import { useSidebar } from '../../context/SidebarContext'
import StaffPageShell from '../../components/StaffPageShell'
import StaffHeader from '../../components/StaffHeader'
import { Card, cn } from '../../components/ui'

export default function MetricsMonitor() {
  const { expanded: sidebarExpanded, toggle: toggleSidebar } = useSidebar()
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null)
  const [liveLatency, setLiveLatency] = useState(0)

  useEffect(() => {
    const unsubscribe = metricsCollector.subscribe(setMetrics)
    return unsubscribe
  }, [])

  // Simulate live latency updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveLatency(prev => {
        const newLatency = Math.max(5, prev + (Math.random() - 0.5) * 3)
        return Math.min(50, newLatency)
      })
    }, 100)
    return () => clearInterval(interval)
  }, [])

  if (!metrics) return <StaffPageShell><p className="p-6 text-ink-muted">Loading metrics…</p></StaffPageShell>

  return (
    <StaffPageShell>
      <StaffHeader
        title="Performance metrics"
        subtitle={`Developer view · updated ${new Date(metrics.timestamp).toLocaleTimeString()}`}
        sidebarExpanded={sidebarExpanded}
        onSidebarToggle={toggleSidebar}
      />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        <p className="rounded-card border border-line bg-status-waiting-bg px-4 py-3 text-sm text-status-waiting-text">
          Some figures on this page are simulated (for example the live latency), so they do not describe real traffic.
        </p>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* ─── CONCURRENCY METRICS ─── */}
          <MetricCard title="Active SSE Connections" value={metrics.concurrency.activeSSEConnections} unit="connections" />
          <MetricCard title="Active Requests" value={metrics.concurrency.activeRequests} unit="requests" />
          <MetricCard title="Orders In Flight" value={metrics.concurrency.ordersInFlight} unit="orders" />

          {/* ─── LATENCY METRICS ─── */}
          <MetricCard
            title="Live Order Latency"
            value={liveLatency.toFixed(2)}
            unit="ms"
            target="< 20ms"
            isLive
          />
          <MetricCard
            title="Avg Order Latency"
            value={metrics.latency.avgOrderLatencyMs.toFixed(2)}
            unit="ms"
            target="< 15ms"
          />
          <MetricCard
            title="P95 Order Latency"
            value={metrics.latency.p95OrderLatencyMs.toFixed(2)}
            unit="ms"
            target="< 50ms"
          />

          {/* ─── APP STARTUP ─── */}
          <MetricCard
            title="App Startup Time"
            value={metrics.latency.appStartupLatencyMs.toFixed(0)}
            unit="ms"
            target="< 800ms"
          />

          {/* ─── THROUGHPUT METRICS ─── */}
          <MetricCard
            title="Orders Per Second"
            value={metrics.throughput.ordersPerSecond.toFixed(2)}
            unit="orders/sec"
          />
          <MetricCard
            title="Total Orders Processed"
            value={metrics.throughput.ordersProcessedTotal}
            unit="orders"
          />

          {/* ─── SYNC METRICS ─── */}
          <MetricCard
            title="Cross-Tab Sync Latency"
            value={metrics.sync.crossTabSyncLatencyMs.toFixed(2)}
            unit="ms"
            target="< 5ms"
          />
          <MetricCard
            title="Last SSE Update"
            value={metrics.sync.lastSSEUpdateMs.toFixed(2)}
            unit="ms"
            target="< 20ms"
          />
          <MetricCard
            title="Broadcast Messages"
            value={metrics.sync.broadcastChannelMessages}
            unit="messages"
          />

          {/* ─── DISTRIBUTION METRICS ─── */}
          <MetricCard
            title="Bundle Size"
            value={metrics.distribution.bundleSizeKB.toFixed(0)}
            unit="KB"
            target="< 300KB"
          />
          <MetricCard
            title="Initial Bundle Load"
            value={metrics.distribution.initialBundleLoadTimeMs.toFixed(0)}
            unit="ms"
            target="< 800ms"
          />
          <MetricCard
            title="Cache Hit Rate"
            value={metrics.distribution.cacheHitRate.toFixed(1)}
            unit="%"
            target="> 80%"
          />

          {/* ─── TIME TO INTERACTIVE ─── */}
          <MetricCard
            title="Time to Interactive"
            value={metrics.distribution.timeToInteractiveMs.toFixed(0)}
            unit="ms"
            target="< 1000ms"
          />

          {/* ─── FAILED ORDERS ─── */}
          <MetricCard
            title="Failed Orders"
            value={metrics.throughput.failedOrdersTotal}
            unit="orders"
            isError={metrics.throughput.failedOrdersTotal > 0}
          />
        </div>

        {/* Performance Status Bar */}
        <Card>
          <h2 className="mb-4 font-display text-xl text-ink">Performance status</h2>
          <div className="space-y-5">
            <PerformanceIndicator
              label="Concurrency Health"
              value={metrics.concurrency.activeSSEConnections + metrics.concurrency.activeRequests}
              good={[0, 100]}
              warning={[100, 500]}
              critical={[500, Infinity]}
              unit="connections"
            />
            <PerformanceIndicator
              label="Latency Health"
              value={metrics.latency.avgOrderLatencyMs}
              good={[0, 15]}
              warning={[15, 50]}
              critical={[50, Infinity]}
              unit="ms"
            />
            <PerformanceIndicator
              label="Throughput"
              value={metrics.throughput.ordersPerSecond}
              good={[1, Infinity]}
              warning={[0.1, 1]}
              critical={[0, 0.1]}
              unit="orders/sec"
            />
            <PerformanceIndicator
              label="Error Rate"
              value={
                metrics.throughput.ordersProcessedTotal + metrics.throughput.failedOrdersTotal > 0
                  ? (metrics.throughput.failedOrdersTotal /
                      (metrics.throughput.ordersProcessedTotal + metrics.throughput.failedOrdersTotal)) *
                    100
                  : 0
              }
              good={[0, 1]}
              warning={[1, 5]}
              critical={[5, Infinity]}
              unit="%"
            />
          </div>
        </Card>

        {/* Information */}
        <Card>
          <h2 className="mb-3 font-display text-lg text-ink">What do these metrics mean?</h2>
          <ul className="space-y-2 text-sm text-ink-muted [&_strong]:font-medium [&_strong]:text-ink">
            <li>
              <strong>Active SSE Connections:</strong> Users connected and receiving live updates
            </li>
            <li>
              <strong>Orders In Flight:</strong> Orders being processed right now
            </li>
            <li>
              <strong>Live Order Latency:</strong> Real-time latency updates (target: less than 20ms)
            </li>
            <li>
              <strong>Cross-Tab Sync:</strong> Speed of order sync between browser tabs (target: less than 5ms)
            </li>
            <li>
              <strong>Orders Per Second:</strong> System throughput during peak hours
            </li>
            <li>
              <strong>Cache Hit Rate:</strong> Percentage of users reusing cached libraries (higher is better)
            </li>
            <li>
              <strong>Error Rate:</strong> Percentage of failed orders (should be less than 1%)
            </li>
          </ul>
        </Card>
      </main>
    </StaffPageShell>
  )
}

// ─── Helper Components ───────────────────────────────────────────

interface MetricCardProps {
  title: string
  value: string | number
  unit: string
  target?: string
  isLive?: boolean
  isError?: boolean
}

function MetricCard({ title, value, unit, target, isLive, isError }: MetricCardProps) {
  return (
    <Card padding="none" className="p-4">
      <p className="text-sm text-ink-muted">{title}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-[28px] font-medium leading-none tabular-nums text-ink">{value}</p>
        <span className="text-sm text-ink-muted">{unit}</span>
        {isLive && <span className="h-2 w-2 animate-pulse rounded-full bg-status-ready-text" aria-hidden />}
      </div>
      {target && (
        <p className={cn('mt-2 text-xs', isError ? 'text-status-cancelled-text' : 'text-ink-muted')}>
          Target: {target}
        </p>
      )}
    </Card>
  )
}

interface PerformanceIndicatorProps {
  label: string
  value: number
  good: [number, number]
  warning: [number, number]
  critical: [number, number]
  unit: string
}

function PerformanceIndicator({
  label,
  value,
  warning,
  critical,
  unit,
}: PerformanceIndicatorProps) {
  let status = 'Good'
  let tone = { fill: 'bg-status-ready-text', pill: 'bg-status-ready-bg text-status-ready-text' }

  if (value >= critical[0] && value <= critical[1]) {
    status = 'Critical'
    tone = { fill: 'bg-status-cancelled-text', pill: 'bg-status-cancelled-bg text-status-cancelled-text' }
  } else if (value >= warning[0] && value <= warning[1]) {
    status = 'Warning'
    tone = { fill: 'bg-status-waiting-text', pill: 'bg-status-waiting-bg text-status-waiting-text' }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="w-36 text-sm font-medium text-ink">{label}</div>
      <div className="h-2 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn('h-full transition-[width] duration-300', tone.fill)}
          style={{ width: Math.min(100, (value / 100) * 100) + '%' }}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm tabular-nums text-ink">{value.toFixed(2)} {unit}</span>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', tone.pill)}>{status}</span>
      </div>
    </div>
  )
}
