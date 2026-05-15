import { useEffect } from 'react'
import { metricsCollector } from '../services/metricsCollector'

/**
 * Initialize metrics collection on app startup
 */
export function useInitializeMetrics() {
  useEffect(() => {
    // Record app startup latency
    const appStartTime = performance.now()
    
    // Get initial bundle info
    if (performance.getEntriesByType) {
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigationTiming) {
        const transferSize = navigationTiming.transferSize || 0
        metricsCollector.recordBundleSize(transferSize / 1024) // Convert to KB
        
        // Record startup latency
        const startupLatency = navigationTiming.loadEventEnd - navigationTiming.fetchStart
        if (startupLatency > 0) {
          metricsCollector.recordAppStartupLatency(startupLatency)
        }
      }
    }

    // Set up periodic cache hit rate tracking
    const trackCacheInterval = setInterval(() => {
      if (performance.getEntriesByType) {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
        const cached = resources.filter(r => (r as any).deliveryType === 'cache').length
        const total = resources.length

        if (total > 0) {
          const cacheHitRate = cached / total
          metricsCollector.recordCacheHitRate(cacheHitRate)
        }
      }
    }, 30000) // Check every 30 seconds

    // Record Time to Interactive using PerformanceObserver
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-input') {
              const tti = entry.startTime
              metricsCollector.recordTimeToInteractive(tti)
            }
          }
        })
        observer.observe({ entryTypes: ['first-input', 'navigation'] })

        return () => {
          clearInterval(trackCacheInterval)
          observer.disconnect()
        }
      } catch {
        return () => clearInterval(trackCacheInterval)
      }
    }

    return () => clearInterval(trackCacheInterval)
  }, [])
}

/**
 * Wrap fetch calls to track request metrics
 */
export function useTrackRequests() {
  useEffect(() => {
    const originalFetch = window.fetch

    window.fetch = function (...args: any[]) {
      metricsCollector.recordActiveRequest(true)

      return originalFetch
        .apply(window, args)
        .then(response => {
          metricsCollector.recordActiveRequest(false)
          return response
        })
        .catch(error => {
          metricsCollector.recordActiveRequest(false)
          throw error
        })
    } as any

    return () => {
      window.fetch = originalFetch
    }
  }, [])
}
