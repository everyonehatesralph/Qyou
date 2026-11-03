import { BellRing } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { useOrders, getMyOrderIds } from '../context/OrderContext'
import { useReadyNotification } from '../hooks/useReadyNotification'
import { orderRef } from '../services/orderModel'
import { Button } from './ui'

/**
 * "Your order is ready" on every guest page, not just the tracker, so a guest browsing the
 * menu for more still hears and sees it. Only for phones that have ordered; never on the
 * landing page or staff screens.
 */
export default function ReadyAlert() {
  const { pathname } = useLocation()
  if (pathname === '/' || pathname.startsWith('/staff') || getMyOrderIds().length === 0) return null
  return <ReadyAlertBanner />
}

function ReadyAlertBanner() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { orders, isConnected } = useOrders()
  const { readyOrder, dismissNotification } = useReadyNotification(orders, isConnected)

  if (!readyOrder) return null
  const onTracker = pathname === `/order/${readyOrder.id}`
  const body = readyOrder.orderType === 'takeaway' && readyOrder.takeawayCode
    ? `Show ${readyOrder.takeawayCode} at the counter.`
    : 'It is on its way to your table.'

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="pointer-events-auto mx-auto flex max-w-3xl items-center gap-3 rounded-card bg-status-ready-bg p-4 text-status-ready-text shadow-pop"
        role="alert"
      >
        <BellRing className="h-5 w-5 shrink-0 animate-ring" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium">Order Nº {orderRef(readyOrder)} is ready!</p>
          <p className="text-sm">{body}</p>
        </div>
        <Button
          size="md"
          className="h-9 shrink-0"
          onClick={() => {
            dismissNotification()
            if (!onTracker) navigate(`/order/${readyOrder.id}`)
          }}
        >
          {onTracker ? 'OK' : 'View'}
        </Button>
      </motion.div>
    </div>
  )
}
