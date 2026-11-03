// The one mapping of order status → label and color group. Every status pill,
// timeline and table tile reads from here.
import type { OrderStatus } from '../context/OrderContext'

export type StatusGroup = 'waiting' | 'progress' | 'ready' | 'done' | 'cancelled'

export const STATUS_META: Record<OrderStatus, { label: string; customerLabel: string; group: StatusGroup }> = {
  pending:   { label: 'Pending',   customerLabel: 'Waiting for confirmation', group: 'waiting' },
  confirmed: { label: 'Confirmed', customerLabel: 'Confirmed',                group: 'progress' },
  preparing: { label: 'Preparing', customerLabel: 'Being prepared',           group: 'progress' },
  ready:     { label: 'Ready',     customerLabel: 'Ready for you',            group: 'ready' },
  served:    { label: 'Served',    customerLabel: 'Served',                   group: 'done' },
  paid:      { label: 'Paid',      customerLabel: 'Paid',                     group: 'done' },
  cancelled: { label: 'Cancelled', customerLabel: 'Cancelled',                group: 'cancelled' },
}

/** Tailwind classes per group. Written out in full so Tailwind's scanner finds them. */
export const STATUS_GROUP_CLASSES: Record<StatusGroup, { bg: string; text: string; border: string; fill: string }> = {
  waiting:   { bg: 'bg-status-waiting-bg',   text: 'text-status-waiting-text',   border: 'border-status-waiting-text',   fill: 'bg-status-waiting-text' },
  progress:  { bg: 'bg-status-progress-bg',  text: 'text-status-progress-text',  border: 'border-status-progress-text',  fill: 'bg-status-progress-text' },
  ready:     { bg: 'bg-status-ready-bg',     text: 'text-status-ready-text',     border: 'border-status-ready-text',     fill: 'bg-status-ready-text' },
  done:      { bg: 'bg-status-done-bg',      text: 'text-status-done-text',      border: 'border-status-done-text',      fill: 'bg-status-done-text' },
  cancelled: { bg: 'bg-status-cancelled-bg', text: 'text-status-cancelled-text', border: 'border-status-cancelled-text', fill: 'bg-status-cancelled-text' },
}

/** Position of a status along the normal flow; served and paid both count as finished. */
export const STATUS_STEP: Record<OrderStatus, number> = {
  pending: 0, confirmed: 1, preparing: 2, ready: 3, served: 4, paid: 4, cancelled: -1,
}

export const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready']
