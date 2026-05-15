/**
 * Real-time Metrics Collection System
 * Tracks concurrency, latency, and distribution metrics
 */

export interface MetricsSnapshot {
  timestamp: number
  concurrency: {
    activeSSEConnections: number
    activeRequests: number
    ordersInFlight: number
  }
  latency: {
    lastOrderLatencyMs: number
    avgOrderLatencyMs: number
    p95OrderLatencyMs: number
    appStartupLatencyMs: number
  }
  throughput: {
    ordersPerSecond: number
    ordersProcessedTotal: number
    failedOrdersTotal: number
  }
  distribution: {
    bundleSizeKB: number
    initialBundleLoadTimeMs: number
    cacheHitRate: number
    timeToInteractiveMs: number
  }
  sync: {
    crossTabSyncLatencyMs: number
    lastSSEUpdateMs: number
    broadcastChannelMessages: number
  }
}

class MetricsCollector {
  private metrics: MetricsSnapshot
  private orderLatencies: number[] = []
  private startTime: number = Date.now()
  private listeners = new Set<(metrics: MetricsSnapshot) => void>()

  constructor() {
    this.metrics = {
      timestamp: Date.now(),
      concurrency: {
        activeSSEConnections: 0,
        activeRequests: 0,
        ordersInFlight: 0,
      },
      latency: {
        lastOrderLatencyMs: 0,
        avgOrderLatencyMs: 0,
        p95OrderLatencyMs: 0,
        appStartupLatencyMs: 0,
      },
      throughput: {
        ordersPerSecond: 0,
        ordersProcessedTotal: 0,
        failedOrdersTotal: 0,
      },
      distribution: {
        bundleSizeKB: 0,
        initialBundleLoadTimeMs: 0,
        cacheHitRate: 0,
        timeToInteractiveMs: 0,
      },
      sync: {
        crossTabSyncLatencyMs: 0,
        lastSSEUpdateMs: 0,
        broadcastChannelMessages: 0,
      },
    }
  }

  // ─── Concurrency Metrics ───────────────────────────────────────
  recordSSEConnection(increase: boolean) {
    this.metrics.concurrency.activeSSEConnections += increase ? 1 : -1
    this.notifyListeners()
  }

  recordActiveRequest(increase: boolean) {
    this.metrics.concurrency.activeRequests += increase ? 1 : -1
    this.notifyListeners()
  }

  recordOrderInFlight(increase: boolean) {
    this.metrics.concurrency.ordersInFlight += increase ? 1 : -1
    this.notifyListeners()
  }

  // ─── Latency Metrics ───────────────────────────────────────
  recordOrderLatency(latencyMs: number) {
    this.orderLatencies.push(latencyMs)
    // Keep last 100 samples for averaging
    if (this.orderLatencies.length > 100) {
      this.orderLatencies.shift()
    }

    this.metrics.latency.lastOrderLatencyMs = latencyMs
    this.metrics.latency.avgOrderLatencyMs =
      this.orderLatencies.reduce((a, b) => a + b, 0) / this.orderLatencies.length

    // Calculate P95 (95th percentile)
    const sorted = [...this.orderLatencies].sort((a, b) => a - b)
    const p95Index = Math.floor(sorted.length * 0.95)
    this.metrics.latency.p95OrderLatencyMs = sorted[p95Index] || 0

    this.notifyListeners()
  }

  recordAppStartupLatency(latencyMs: number) {
    this.metrics.latency.appStartupLatencyMs = latencyMs
    this.notifyListeners()
  }

  recordSSEUpdateLatency(latencyMs: number) {
    this.metrics.sync.lastSSEUpdateMs = latencyMs
    this.notifyListeners()
  }

  recordCrossTabSyncLatency(latencyMs: number) {
    this.metrics.sync.crossTabSyncLatencyMs = latencyMs
    this.notifyListeners()
  }

  // ─── Throughput Metrics ───────────────────────────────────────
  recordOrderProcessed(success: boolean) {
    if (success) {
      this.metrics.throughput.ordersProcessedTotal += 1
    } else {
      this.metrics.throughput.failedOrdersTotal += 1
    }

    // Calculate orders per second (last 60 seconds)
    const elapsedSeconds = (Date.now() - this.startTime) / 1000
    if (elapsedSeconds > 0) {
      const totalOrders =
        this.metrics.throughput.ordersProcessedTotal + this.metrics.throughput.failedOrdersTotal
      this.metrics.throughput.ordersPerSecond = totalOrders / elapsedSeconds
    }

    this.notifyListeners()
  }

  // ─── Distribution Metrics ───────────────────────────────────────
  recordBundleSize(sizeKB: number) {
    this.metrics.distribution.bundleSizeKB = sizeKB
    this.notifyListeners()
  }

  recordInitialBundleLoadTime(timeMs: number) {
    this.metrics.distribution.initialBundleLoadTimeMs = timeMs
    this.notifyListeners()
  }

  recordCacheHitRate(rate: number) {
    // rate is 0-1 (0% to 100%)
    this.metrics.distribution.cacheHitRate = rate * 100
    this.notifyListeners()
  }

  recordTimeToInteractive(timeMs: number) {
    this.metrics.distribution.timeToInteractiveMs = timeMs
    this.notifyListeners()
  }

  // ─── Sync Metrics ───────────────────────────────────────
  recordBroadcastChannelMessage() {
    this.metrics.sync.broadcastChannelMessages += 1
    this.notifyListeners()
  }

  // ─── Listeners ───────────────────────────────────────
  subscribe(listener: (metrics: MetricsSnapshot) => void): () => void {
    this.listeners.add(listener)
    // Send current metrics immediately
    listener(this.getSnapshot())
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    this.metrics.timestamp = Date.now()
    this.listeners.forEach(listener => listener(this.getSnapshot()))
  }

  getSnapshot(): MetricsSnapshot {
    return { ...this.metrics }
  }
}

export const metricsCollector = new MetricsCollector()
