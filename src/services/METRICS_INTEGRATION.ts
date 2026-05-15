/**
 * Metrics Integration Guide
 * 
 * This file shows how to integrate metricsCollector into existing services
 * to start collecting real-time performance data
 */

import { metricsCollector } from './metricsCollector'

// ═══════════════════════════════════════════════════════════════════════════════
// 1. ORDER SERVICE - Track Order Latency
// ═══════════════════════════════════════════════════════════════════════════════
/*
In src/services/orderService.ts, wrap order operations:

export async function placeOrder(order: Order) {
  const startTime = performance.now()
  metricsCollector.recordOrderInFlight(true)
  metricsCollector.recordActiveRequest(true)
  
  try {
    const res = await fetch('/api/orders/place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    })
    
    const latency = performance.now() - startTime
    metricsCollector.recordOrderLatency(latency)
    metricsCollector.recordOrderProcessed(res.ok)
    
    return res.ok
  } finally {
    metricsCollector.recordOrderInFlight(false)
    metricsCollector.recordActiveRequest(false)
  }
}
*/

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ORDER SYNC - Track SSE Connections
// ═══════════════════════════════════════════════════════════════════════════════
/*
In src/services/orderSync.ts:

class OrderSyncClient {
  connect() {
    try {
      const es = new EventSource('/api/orders/stream')
      metricsCollector.recordSSEConnection(true)  // ← SSE connected
      
      es.onmessage = (event) => {
        const startTime = performance.now()
        const orders = JSON.parse(event.data)
        const latency = performance.now() - startTime
        metricsCollector.recordSSEUpdateLatency(latency)
      }
      
      es.onerror = () => {
        metricsCollector.recordSSEConnection(false)  // ← SSE disconnected
      }
    } catch {
      // fallback
    }
  }
}
*/

// ═══════════════════════════════════════════════════════════════════════════════
// 3. BROADCAST SYNC - Track Cross-Tab Sync
// ═══════════════════════════════════════════════════════════════════════════════
/*
In src/context/BroadcastSync.ts:

export function broadcast(type: SyncMessage['type'], payload: unknown): void {
  const startTime = performance.now()
  const ch = getChannel()
  if (ch) {
    ch.postMessage({ type, payload, senderId })
    const latency = performance.now() - startTime
    metricsCollector.recordCrossTabSyncLatency(latency)
    metricsCollector.recordBroadcastChannelMessage()
  }
}
*/

// ═══════════════════════════════════════════════════════════════════════════════
// 4. APP STARTUP - Track Initial Load Time
// ═══════════════════════════════════════════════════════════════════════════════
/*
In src/main.tsx (at the very top):

const appStartTime = performance.now()

// ... rest of app initialization ...

// When app is fully rendered (in App.tsx or after first render):
useEffect(() => {
  const loadTime = performance.now() - appStartTime
  metricsCollector.recordAppStartupLatency(loadTime)
  
  // Record bundle size (from performance API)
  if (performance.getEntriesByType) {
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigationTiming) {
      const transferSize = navigationTiming.transferSize || 0
      metricsCollector.recordBundleSize(transferSize / 1024) // Convert to KB
    }
  }
}, [])
*/

// ═══════════════════════════════════════════════════════════════════════════════
// 5. CACHE HIT RATE - Track Cache Effectiveness
// ═══════════════════════════════════════════════════════════════════════════════
/*
In src/services/supabaseClient.ts or cache service:

// Track which resources came from cache vs network
function trackResourceCache() {
  if (performance.getEntriesByType) {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const cached = resources.filter(r => (r as any).deliveryType === 'cache').length
    const total = resources.length
    
    if (total > 0) {
      const cacheHitRate = cached / total
      metricsCollector.recordCacheHitRate(cacheHitRate)
    }
  }
}

// Call this periodically (e.g., every 30 seconds)
setInterval(trackResourceCache, 30000)
*/

// ═══════════════════════════════════════════════════════════════════════════════
// 6. TIME TO INTERACTIVE - Track Interactivity
// ═══════════════════════════════════════════════════════════════════════════════
/*
Using Web Vitals library (optional):

import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

getCLS(metric => {
  // Cumulative Layout Shift
})

getFID(metric => {
  // First Input Delay
})

getFCP(metric => {
  // First Contentful Paint
})

getLCP(metric => {
  // Largest Contentful Paint
  metricsCollector.recordTimeToInteractive(metric.value)
})

getTTFB(metric => {
  // Time to First Byte
})
*/

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK START - Add these hooks to track metrics
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hook to track page navigation latency
 */
export function usePageLoadMetrics() {
  useEffect(() => {
    const startTime = performance.now()
    
    return () => {
      const loadTime = performance.now() - startTime
      metricsCollector.recordTimeToInteractive(loadTime)
    }
  }, [])
}

/**
 * Hook to track active requests
 */
export function useTrackRequest(name: string) {
  const trackRequest = async <T,>(fn: () => Promise<T>): Promise<T> => {
    metricsCollector.recordActiveRequest(true)
    try {
      return await fn()
    } finally {
      metricsCollector.recordActiveRequest(false)
    }
  }
  
  return { trackRequest }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCESS THE METRICS DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
/*
Once integrated, visit: http://localhost:5173/staff/metrics
(after logging in as staff)

The dashboard will show real-time:
- Concurrent connections
- Order latency (last, avg, p95)
- Throughput (orders per second)
- Sync latency
- Bundle size
- Cache hit rate
- Error rates
- And more...
*/
