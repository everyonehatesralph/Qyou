import { useRef } from 'react'
import { X, Printer } from 'lucide-react'
import type { Order } from '../context/OrderContext'

interface InvoiceModalProps {
  order: Order
  onClose: () => void
}

const VAT_RATE = 0.12

export default function InvoiceModal({ order, onClose }: InvoiceModalProps) {
  const invoiceRef = useRef<HTMLDivElement>(null)
  const subtotal = order.total / (1 + VAT_RATE)
  const vat      = order.total - subtotal

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const handlePrint = () => {
    const content = invoiceRef.current?.innerHTML
    if (!content) return
    const printWin = window.open('', '_blank', 'width=400,height=650')
    if (!printWin) return
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt #${order.id} — DeVerse Cafe</title>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Outfit', sans-serif;
              background: #fff; color: #222;
              padding: 28px 24px;
              max-width: 340px; margin: 0 auto;
            }
            .brand { text-align: center; margin-bottom: 16px; }
            .brand h1 { font-size: 20px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.5px; }
            .brand p { font-size: 11px; color: #999; margin-top: 2px; }
            .dash { border: none; border-top: 1px dashed #d0d0d0; margin: 14px 0; }
            .meta { font-size: 11px; color: #666; line-height: 1.7; }
            .meta strong { color: #333; }
            .items { width: 100%; margin: 12px 0; border-collapse: collapse; }
            .items th { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; border-bottom: 1px solid #eee; padding: 4px 0; text-align: left; }
            .items th:last-child, .items td:last-child { text-align: right; }
            .items td { font-size: 12px; padding: 7px 0; border-bottom: 1px solid #f5f5f5; color: #333; }
            .totals { font-size: 12px; color: #666; }
            .totals .row { display: flex; justify-content: space-between; padding: 3px 0; }
            .totals .grand { font-size: 16px; font-weight: 700; color: #1a1a1a; border-top: 2px solid #222; margin-top: 8px; padding-top: 10px; }
            .footer { text-align: center; font-size: 10px; color: #bbb; margin-top: 24px; line-height: 1.5; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="brand">
            <h1>DeVerse Cafe</h1>
            <p>Official Receipt</p>
          </div>
          <hr class="dash" />
          <div class="meta">
            <div><strong>Receipt #</strong> ${order.id}</div>
            <div><strong>Date</strong> &nbsp; ${formatDate(order.createdAt)}</div>
            <div><strong>Table</strong> &nbsp; ${order.tableName}</div>
            <div><strong>Customer</strong> &nbsp; ${order.customerName}</div>
            ${order.notes ? `<div><strong>Notes</strong> &nbsp; ${order.notes}</div>` : ''}
          </div>
          <hr class="dash" />
          <table class="items">
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td style="text-align:center">${item.quantity}</td>
                  <td style="text-align:right">₱${item.price.toFixed(0)}</td>
                  <td>₱${(item.price * item.quantity).toFixed(0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <hr class="dash" />
          <div class="totals">
            <div class="row"><span>Subtotal</span><span>₱${subtotal.toFixed(2)}</span></div>
            <div class="row"><span>VAT (12%)</span><span>₱${vat.toFixed(2)}</span></div>
            <div class="row grand"><span>Total</span><span>₱${order.total.toFixed(0)}</span></div>
          </div>
          <div class="footer">
            <p>Thank you for dining with us!</p>
            <p>This serves as your official receipt.</p>
          </div>
        </body>
      </html>
    `)
    printWin.document.close()
    setTimeout(() => printWin.print(), 500)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 rounded-2xl overflow-hidden max-w-md mx-auto"
        style={{ backgroundColor: '#FFFFFF', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
      >
        {/* Header bar (dark accent strip) */}
        <div
          className="flex items-center justify-between px-5 py-3 sticky top-0"
          style={{ backgroundColor: '#1a1a1a' }}
        >
          <h2 className="text-white font-bold text-sm">Your Receipt</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Paper white invoice content ── */}
        <div ref={invoiceRef} className="px-6 py-6" style={{ color: '#222' }}>
          {/* Brand */}
          <div className="text-center mb-5">
            <h1 className="text-xl font-bold tracking-tight" style={{ color: '#1a1a1a' }}>
              DeVerse Cafe
            </h1>
            <p className="text-xs mt-0.5" style={{ color: '#999' }}>Official Receipt</p>
          </div>

          {/* Dashed divider */}
          <div className="my-4" style={{ borderTop: '1px dashed #d0d0d0' }} />

          {/* Order meta */}
          <div className="space-y-1 mb-4" style={{ fontSize: '12px', color: '#666' }}>
            {[
              ['Receipt #', order.id],
              ['Date', formatDate(order.createdAt)],
              ['Table', order.tableName],
              ['Customer', order.customerName],
              ...(order.notes ? [['Notes', order.notes]] : []),
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-2">
                <span style={{ fontWeight: 600, color: '#444' }}>{label}</span>
                <span className="text-right" style={{ maxWidth: '60%' }}>{value}</span>
              </div>
            ))}
          </div>

          <div className="my-4" style={{ borderTop: '1px dashed #d0d0d0' }} />

          {/* Items table */}
          <div className="mb-4">
            <div className="grid grid-cols-12 gap-1 mb-2">
              {['Item', 'Qty', 'Price', 'Total'].map((h, i) => (
                <span key={h}
                  className={`text-[9px] font-semibold uppercase tracking-wider ${
                    i === 0 ? 'col-span-5' : i === 3 ? 'col-span-3 text-right' : 'col-span-2 text-center'
                  }`}
                  style={{ color: '#999' }}
                >
                  {h}
                </span>
              ))}
            </div>
            {order.items.map(item => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-1 items-center py-1.5"
                style={{ borderBottom: '1px solid #f0f0f0', fontSize: '13px' }}
              >
                <span className="col-span-5 font-medium" style={{ color: '#333' }}>{item.name}</span>
                <span className="col-span-2 text-center" style={{ color: '#666' }}>{item.quantity}</span>
                <span className="col-span-2 text-center" style={{ color: '#666' }}>₱{item.price}</span>
                <span className="col-span-3 text-right font-semibold" style={{ color: '#222' }}>
                  ₱{(item.price * item.quantity).toFixed(0)}
                </span>
              </div>
            ))}
          </div>

          <div className="my-4" style={{ borderTop: '1px dashed #d0d0d0' }} />

          {/* Totals */}
          <div className="space-y-1" style={{ fontSize: '13px' }}>
            <div className="flex justify-between" style={{ color: '#888' }}>
              <span>Subtotal (excl. VAT)</span>
              <span>₱{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between" style={{ color: '#888' }}>
              <span>VAT (12%)</span>
              <span>₱{vat.toFixed(2)}</span>
            </div>
            <div
              className="flex justify-between pt-3 mt-2"
              style={{ borderTop: '2px solid #222', fontWeight: 700, fontSize: '16px', color: '#1a1a1a' }}
            >
              <span>Total</span>
              <span>₱{order.total.toFixed(0)}</span>
            </div>
          </div>

          <div className="my-5" style={{ borderTop: '1px dashed #d0d0d0' }} />

          <p className="text-center text-[11px] leading-relaxed" style={{ color: '#bbb' }}>
            Thank you for dining at DeVerse Cafe!<br />
            We hope to see you again soon. ☕
          </p>
        </div>

        {/* Print button */}
        <div
          className="px-5 py-4 sticky bottom-0"
          style={{ backgroundColor: '#fafafa', borderTop: '1px solid #eee' }}
        >
          <button
            onClick={handlePrint}
            className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all active:scale-[0.98]"
            style={{ backgroundColor: '#1a1a1a', color: '#fff' }}
          >
            <Printer className="w-5 h-5" />
            Print Receipt
          </button>
        </div>
      </div>
    </>
  )
}