// The guest's order receipt: what the receipt view shows and what Download receipt saves as
// an image, built once so the two always agree. It is an order receipt, not an official
// (BIR) receipt, and says so. No runtime imports, so node --test can load this file.

/** What a receipt needs from an order. Queue numbers, options and online payment exist only on some backends. */
export interface ReceiptOrder {
  id: string
  /** Today's queue number (Nº 042), when the order has one. */
  number?: number
  tableName: string
  customerName: string
  orderType: 'dineIn' | 'takeaway'
  takeawayCode?: string
  createdAt: string
  status: string
  paidAt?: string
  paidOnlineAt?: string
  total: number
  notes?: string
  items: { name: string; price: number; quantity: number; options?: { choice: string }[] }[]
}

export interface ReceiptLine {
  quantity: number
  name: string
  /** "Large · Iced", or empty. */
  options: string
  each: string
  amount: string
}

export interface Receipt {
  place: string
  /** Nº 042, or the order id. */
  ref: string
  /** Rows under the heading: order number, date, table or take-away code, name, status, payment. */
  details: [label: string, value: string][]
  lines: ReceiptLine[]
  /** Add-ons and the guest's note, one per line. */
  notes: string[]
  total: string
  disclaimer: string
}

export const RECEIPT_DISCLAIMER = 'Order receipt — not an official receipt'

/** Nº 042 when the order has a queue number; otherwise its id, shortened when it is a long one. */
export function receiptRef(o: Pick<ReceiptOrder, 'id' | 'number'>): string {
  if (o.number) return String(o.number).padStart(3, '0')
  return o.id.length <= 8 ? o.id : o.id.slice(0, 6).toUpperCase()
}

// Checkout puts the order type first in the notes ("Dine In | + Oat Milk | Extra hot")
const ORDER_TYPES = new Set(['dine in', 'take away'])

/** Add-ons and the guest's note from an order's notes, without the order type. */
export function receiptNotes(notes?: string): string[] {
  return (notes ?? '')
    .split('|')
    .map(s => s.trim())
    .filter(s => s && !ORDER_TYPES.has(s.toLowerCase()))
}

/** "4 Nov 2026, 12:41 PM" in the phone's time zone. */
export function receiptDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-PH', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export interface ReceiptContext {
  /** The restaurant's name. */
  place: string
  /** Formats an amount: 165 → "₱165". */
  money: (amount: number) => string
  /** The guest-facing name of a status ("Being prepared"). */
  statusLabel: (status: string) => string
}

export function buildReceipt(order: ReceiptOrder, { place, money, statusLabel }: ReceiptContext): Receipt {
  const ref = receiptRef(order)
  const takeaway = order.orderType === 'takeaway'
  const paid = order.status === 'paid' || !!order.paidAt || !!order.paidOnlineAt
  const cancelled = order.status === 'cancelled'

  const details: [string, string][] = [
    ['Order Nº', ref],
    ['Date', receiptDate(order.createdAt)],
    takeaway ? ['Take away', order.takeawayCode || order.tableName] : ['Table', order.tableName],
    ['Name', order.customerName || 'Guest'],
    ['Status', statusLabel(order.status)],
  ]
  // A paid order's status already says so
  if (!cancelled && order.status !== 'paid') details.push(['Payment', paid ? 'Paid' : 'Not paid yet'])
  // A long order id (another backend's) is what finds the order later; keep it on the receipt
  if (ref !== order.id) details.push(['Order ID', order.id])

  return {
    place,
    ref,
    details,
    lines: order.items.map(item => ({
      quantity: item.quantity,
      name: item.name,
      options: (item.options ?? []).map(o => o.choice).filter(Boolean).join(' · '),
      each: money(item.price),
      amount: money(item.price * item.quantity),
    })),
    notes: receiptNotes(order.notes),
    total: money(order.total),
    disclaimer: RECEIPT_DISCLAIMER,
  }
}

/** "qyou-receipt-demo-cafe-90001.png" */
export function receiptFileName(place: string, ref: string): string {
  const slug = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `qyou-receipt-${[slug(place), slug(ref)].filter(Boolean).join('-')}.png`
}
