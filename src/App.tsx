import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import { lazy, Suspense } from 'react'
import Navigation from './components/Navigation'
import LoadingSpinner from './components/LoadingSpinner'
import ProtectedRoute from './components/ProtectedRoute'

// Customer
const Welcome        = lazy(() => import('./pages/Welcome'))
const TokenValidation= lazy(() => import('./pages/customer/TokenValidation'))
const Menu           = lazy(() => import('./pages/customer/Menu'))
const SearchPage     = lazy(() => import('./pages/customer/Search'))
const Cart           = lazy(() => import('./pages/customer/Cart'))
const OrderStatus    = lazy(() => import('./pages/customer/OrderStatus'))
const MyOrders       = lazy(() => import('./pages/customer/MyOrders'))

// Staff (protected)
const StaffLogin     = lazy(() => import('./pages/staff/StaffLogin'))
const Dashboard      = lazy(() => import('./pages/staff/Dashboard'))
const OrderQueue     = lazy(() => import('./pages/staff/OrderQueue'))
const MenuManagement = lazy(() => import('./pages/staff/MenuManagement'))
const QRCodeGenerator= lazy(() => import('./pages/staff/QRCodeGenerator'))

// Shared
const ExpiredSession = lazy(() => import('./pages/shared/ExpiredSession'))
const NotFound       = lazy(() => import('./pages/NotFound'))

export default function App() {
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
          <Route path="/expired"           element={<ExpiredSession />} />

          {/* Staff login — open */}
          <Route path="/staff/login"       element={<StaffLogin />} />

          {/* Staff routes — protected: redirects to /staff/login if not authenticated */}
          <Route path="/staff/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/staff/kitchen"     element={<ProtectedRoute><OrderQueue /></ProtectedRoute>} />
          <Route path="/staff/menu"        element={<ProtectedRoute><MenuManagement /></ProtectedRoute>} />
          <Route path="/staff/qr-codes"    element={<ProtectedRoute><QRCodeGenerator /></ProtectedRoute>} />
          <Route path="*"                  element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  )
}
