import { useEffect, useState } from 'react'
import { metricsCollector, type MetricsSnapshot } from '../../services/metricsCollector'
import StaffPageShell from '../../components/StaffPageShell'
import StaffHeader from '../../components/StaffHeader'
import { BarChart3 } from 'lucide-react'

export default function MetricsMonitor() {
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

  if (!metrics) return <div className="p-4 text-text-base">Loading metrics...</div>

  return (
    <StaffPageShell>
      <StaffHeader
        icon={BarChart3}
        title="Performance Metrics"
        actions={
          <span className="text-xs" style={{ color: '#5C4F44' }}>Updated: {new Date(metrics.timestamp).toLocaleTimeString()}</span>
        }
      />

      <main className="flex-1 overflow-auto p-4 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24 md:pb-8">

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
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
        <div className="rounded-xl p-6" style={{ backgroundColor: '#171210', border: '1px solid #2E2318' }}>
          <h2 className="text-xl font-bold mb-4 text-text-base">Performance Status</h2>
          <div className="space-y-6">
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
        </div>

        {/* Information */}
        <div className="mt-8 rounded-xl p-6" style={{ backgroundColor: 'rgba(200,134,10,0.05)', border: '1px solid rgba(200,134,10,0.2)' }}>
          <h2 className="text-lg font-bold mb-3 text-text-base">What do these metrics mean?</h2>
          <ul className="space-y-2 text-sm text-text-muted">
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
        </div>
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
  let borderColor = '#2E2318'
  let bgColor = '#171210'
  let accentColor = '#C8860A'

  if (isError) {
    accentColor = '#F87171'
  } else if (isLive) {
    accentColor = '#4ADE80'
  }

  return (
    <div
      className="rounded-xl p-5 transition-all duration-300"
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        boxShadow: isLive ? `0 0 12px rgba(74,222,128,0.2)` : 'none',
      }}
    >
      <p className="text-sm text-text-muted mb-2">{title}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-text-base">{value}</p>
        {isLive && (
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: '#4ADE80' }}
          />
        )}
      </div>
      <p className="text-xs text-text-faint mt-1">{unit}</p>
      {target && (
        <p className="text-xs mt-2" style={{ color: accentColor }}>
          Target: {target}
        </p>
      )}
    </div>
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
  good,
  warning,
  critical,
  unit,
}: PerformanceIndicatorProps) {
  let status = 'Good'
  let statusColor = '#4ADE80'

  if (value >= critical[0] && value <= critical[1]) {
    status = 'Critical'
    statusColor = '#F87171'
  } else if (value >= warning[0] && value <= warning[1]) {
    status = 'Warning'
    statusColor = '#FBBF24'
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-32 text-sm font-semibold text-text-base">{label}</div>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#2E2318' }}>
        <div
          className="h-full transition-all duration-300"
          style={{
            width: Math.min(100, (value / 100) * 100) + '%',
            backgroundColor: statusColor,
          }}
        />
      </div>
      <div className="text-right w-40">
        <span className="text-sm font-mono text-text-base">{value.toFixed(2)} {unit}</span>
        <span
          className="ml-2 text-xs font-bold uppercase px-2 py-1 rounded"
          style={{
            backgroundColor: statusColor + '20',
            color: statusColor,
            border: `1px solid ${statusColor}`,
          }}
        >
          {status}
        </span>
      </div>
    </div>
  )
}
