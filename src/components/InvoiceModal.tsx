import { Printer } from 'lucide-react'
import type { Order } from '../context/OrderContext'
import { RESTAURANT } from '../config/restaurant'
import { BottomSheet, Button } from './ui'
import { orderRef } from '../services/orderModel'

interface InvoiceModalProps {
  order: Order
  open: boolean
  onClose: () => void
}

const VAT_RATE = 0.12

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })

/** Escapes text going into the print window's HTML. */
const esc = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

/** "Order summary" sheet with a printable version (black on white). */
export default function InvoiceModal({ order, open, onClose }: InvoiceModalProps) {
  const subtotal = order.total / (1 + VAT_RATE)
  const vat = order.total - subtotal
  const money = (n: number, digits = 0) => `${RESTAURANT.currency}${n.toFixed(digits)}`

  const meta: [string, string][] = [
    ['Order', orderRef(order)],
    ['Date', formatDate(order.createdAt)],
    ['Table', order.tableName],
    ['Name', order.customerName],
    ...(order.notes ? [['Notes', order.notes] as [string, string]] : []),
  ]

  const handlePrint = () => {
    const printWin = window.open('', '_blank', 'width=400,height=650')
    if (!printWin) return
    printWin.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <title>Order ${esc(orderRef(order))} — ${esc(RESTAURANT.name)}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: system-ui, sans-serif; background: white; color: black; padding: 28px 24px; max-width: 340px; margin: 0 auto; }
            h1 { font-size: 20px; font-weight: 600; text-align: center; }
            .sub { font-size: 11px; color: dimgray; text-align: center; margin-top: 2px; }
            hr { border: none; border-top: 1px dashed gray; margin: 14px 0; }
            .meta { font-size: 11px; line-height: 1.7; }
            .meta b { font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin: 8px 0; }
            th { font-size: 9px; text-transform: uppercase; letter-spacing: .5px; color: dimgray; text-align: left; padding: 4px 0; border-bottom: 1px solid silver; }
            td { font-size: 12px; padding: 6px 0; border-bottom: 1px solid gainsboro; }
            th:last-child, td:last-child { text-align: right; }
            .row { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; }
            .grand { font-size: 16px; font-weight: 600; border-top: 2px solid black; margin-top: 8px; padding-top: 10px; }
            .foot { text-align: center; font-size: 10px; color: dimgray; margin-top: 24px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>${esc(RESTAURANT.name)}</h1>
          <p class="sub">Order summary</p>
          <hr />
          <div class="meta">${meta.map(([k, v]) => `<div><b>${esc(k)}</b> &nbsp; ${esc(v)}</div>`).join('')}</div>
          <hr />
          <table>
            <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${esc(item.name)}</td>
                  <td>${item.quantity}</td>
                  <td>${money(item.price)}</td>
                  <td>${money(item.price * item.quantity)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
          <div class="row"><span>Subtotal (excl. VAT)</span><span>${money(subtotal, 2)}</span></div>
          <div class="row"><span>VAT (12%)</span><span>${money(vat, 2)}</span></div>
          <div class="row grand"><span>Total</span><span>${money(order.total)}</span></div>
          <p class="foot">Thank you for ordering at ${esc(RESTAURANT.name)}. Ordering by Qyou.</p>
        </body>
      </html>`)
    printWin.document.close()
    setTimeout(() => printWin.print(), 300)
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Order summary"
      description={RESTAURANT.name}
      footer={<Button fullWidth size="lg" leftIcon={<Printer />} onClick={handlePrint}>Print</Button>}
    >
      <dl className="space-y-1.5 text-sm">
        {meta.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="max-w-[65%] text-right text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <table className="mt-5 w-full text-[15px]">
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-muted">
            <th className="pb-2 font-medium">Item</th>
            <th className="pb-2 text-center font-medium">Qty</th>
            <th className="pb-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {order.items.map(item => (
            <tr key={item.id}>
              <td className="py-2.5 pr-2 text-ink">
                {item.name}
                <span className="block text-[13px] text-ink-muted">{money(item.price)} each</span>
              </td>
              <td className="py-2.5 text-center tabular-nums text-ink">{item.quantity}</td>
              <td className="py-2.5 text-right tabular-nums text-ink">{money(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
        <div className="flex justify-between text-ink-muted">
          <dt>Subtotal (excl. VAT)</dt>
          <dd className="tabular-nums">{money(subtotal, 2)}</dd>
        </div>
        <div className="flex justify-between text-ink-muted">
          <dt>VAT (12%)</dt>
          <dd className="tabular-nums">{money(vat, 2)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-2 text-base font-medium text-ink">
          <dt>Total</dt>
          <dd className="tabular-nums">{money(order.total)}</dd>
        </div>
      </dl>
    </BottomSheet>
  )
}
