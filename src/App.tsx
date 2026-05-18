import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import { lazy, Suspense, useEffect } from 'react'
import Navigation from './components/Navigation'
import LoadingSpinner from './components/LoadingSpinner'
import ProtectedRoute from './components/ProtectedRoute'
import { metricsCollector } from './services/metricsCollector'

// Customer
const Welcome        = lazy(() => import('./pages/Welcome'))
const TokenValidation= lazy(() => import('./pages/customer/TokenValidation'))
const Menu           = lazy(() => import('./pages/customer/Menu'))
const SearchPage     = lazy(() => import('./pages/customer/Search'))
const Cart           = lazy(() => import('./pages/customer/Cart'))
const OrderStatus    = lazy(() => import('./pages/customer/OrderStatus'))
const MyOrders       = lazy(() => import('./pages/customer/MyOrders'))
const TakeawayPickup = lazy(() => import('./pages/customer/TakeawayPickup'))

// Staff (protected)
const StaffLogin     = lazy(() => import('./pages/staff/StaffLogin'))
const Dashboard      = lazy(() => import('./pages/staff/Dashboard'))
const OrderQueue     = lazy(() => import('./pages/staff/OrderQueue'))
const MenuManagement = lazy(() => import('./pages/staff/MenuManagement'))
const QRCodeGenerator= lazy(() => import('./pages/staff/QRCodeGenerator'))
const SalesTracker   = lazy(() => import('./pages/staff/SalesTracker'))
const TableAvailability = lazy(() => import('./pages/staff/TableAvailability'))
const MetricsMonitor = lazy(() => import('./pages/staff/MetricsMonitor'))

// Shared
const ExpiredSession = lazy(() => import('./pages/shared/ExpiredSession'))
const NotFound       = lazy(() => import('./pages/NotFound'))

export default function App() {
  // Initialize metrics collection
  useEffect(() => {
    // Record app startup time
    const appStartTime = performance.now()

    // Get initial bundle info
    if (performance.getEntriesByType) {
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigationTiming) {
        const transferSize = navigationTiming.transferSize || 0
        metricsCollector.recordBundleSize(transferSize / 1024)
      }
    }

    // Record when app becomes interactive
    return () => {
      const loadTime = performance.now() - appStartTime
      metricsCollector.recordTimeToInteractive(loadTime)
    }
  }, [])

  // Wrap fetch to track active requests
  useEffect(() => {
    const originalFetch = window.fetch

    window.fetch = function (...args: any[]) {
      metricsCollector.recordActiveRequest(true)

      return originalFetch
        .apply(window, args as any)
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

  return (
    <Router>
      <Navigation />
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Customer routes — open access */}
          <Route path="/"                  element={<Welcome />} />
          <Route path="/table/:tableId"    element={<TokenValidation />} />
          <Route path="/t/:tableId"        element={<TokenValidation />} />
          <Route path="/menu"              element={<Menu />} />
          <Route path="/search"            element={<SearchPage />} />
          <Route path="/cart"              element={<Cart />} />
          <Route path="/order/:orderId"    element={<OrderStatus />} />
          <Route path="/my-orders"         element={<MyOrders />} />
          <Route path="/takeaway-pickup"   element={<TakeawayPickup />} />
          <Route path="/expired"           element={<ExpiredSession />} />

          {/* Staff login — open */}
          <Route path="/staff/login"       element={<StaffLogin />} />

          {/* Staff routes — protected: redirects to /staff/login if not authenticated */}
          <Route path="/staff/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/staff/kitchen"     element={<ProtectedRoute><OrderQueue /></ProtectedRoute>} />
          <Route path="/staff/menu"        element={<ProtectedRoute><MenuManagement /></ProtectedRoute>} />
          <Route path="/staff/qr-codes"    element={<ProtectedRoute><QRCodeGenerator /></ProtectedRoute>} />
          <Route path="/staff/sales"       element={<ProtectedRoute><SalesTracker /></ProtectedRoute>} />
          <Route path="/staff/tables"      element={<ProtectedRoute><TableAvailability /></ProtectedRoute>} />
          <Route path="/staff/metrics"     element={<ProtectedRoute><MetricsMonitor /></ProtectedRoute>} />
          <Route path="*"                  element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  )
}
