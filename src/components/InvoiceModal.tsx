import { Download, Share2 } from 'lucide-react'
import type { Order } from '../context/OrderContext'
import { RESTAURANT } from '../config/restaurant'
import { receiptFor, useReceipt } from '../hooks/useReceipt'
import type { Receipt } from '../services/receipt'
import { BottomSheet, Button, LetterTile, cn } from './ui'

interface ReceiptSheetProps {
  order: Order
  open: boolean
  onClose: () => void
}

/**
 * The receipt on paper: light in both modes, laid out like the image Download receipt saves
 * (src/services/receiptImage.ts draws the same receipt).
 */
export function ReceiptPaper({ receipt, className }: { receipt: Receipt; className?: string }) {
  return (
    <div data-theme="light" className={cn('receipt-edge paper-shadow rounded-t-[14px] bg-surface px-5 pb-9 pt-5 text-ink', className)}>
      <div className="flex flex-col items-center text-center">
        <LetterTile text={RESTAURANT.logoText} tone="accent" size="sm" className="h-10 w-10 text-base" />
        <p className="mt-3 text-balance font-display text-xl leading-tight">{receipt.place}</p>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-ink-muted">Order receipt</p>
      </div>

      <div className="perforation my-4" />
      <dl className="space-y-1 text-[13px]">
        {receipt.details.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="shrink-0 text-ink-muted">{label}</dt>
            <dd className={cn('min-w-0 text-right font-medium', label === 'Order ID' ? 'break-all font-mono text-xs' : 'break-words')}>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="perforation my-4" />
      <ul className="space-y-2.5">
        {receipt.lines.map((line, i) => (
          <li key={`${line.name}-${i}`}>
            <p className="flex justify-between gap-3 text-[15px] font-medium">
              <span className="min-w-0 break-words">{line.quantity}× {line.name}</span>
              <span className="shrink-0 tabular-nums">{line.amount}</span>
            </p>
            <p className="text-[13px] text-ink-muted">{[`${line.each} each`, line.options].filter(Boolean).join(' · ')}</p>
          </li>
        ))}
      </ul>
      {receipt.notes.length > 0 && (
        <div className="mt-3 text-[13px]">
          <p className="text-ink-muted">Notes</p>
          <ul className="break-words">
            {receipt.notes.map((note, i) => <li key={i}>{note}</li>)}
          </ul>
        </div>
      )}

      <div className="perforation my-4" />
      <p className="flex justify-between font-display text-lg">
        <span>Total</span>
        <span className="tabular-nums">{receipt.total}</span>
      </p>
      <div className="perforation my-4" />
      <p className="text-center text-xs text-ink-muted">{receipt.disclaimer}</p>
    </div>
  )
}

/** The receipt view: the receipt itself, Download receipt (a PNG) and, where the phone can, Share. */
export default function ReceiptSheet({ order, open, onClose }: ReceiptSheetProps) {
  const { download, share, canShare, busy } = useReceipt(order)

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Receipt"
      description="Save it to your phone as an image."
      footer={
        // Side by side once there is room for both labels
        <div className={cn('grid gap-2.5', canShare && 'min-[400px]:grid-cols-[1fr_auto]')}>
          <Button variant="primary" size="lg" leftIcon={<Download />} onClick={download} aria-busy={busy === 'download'}>
            {busy === 'download' ? 'Saving…' : 'Download receipt'}
          </Button>
          {canShare && (
            <Button size="lg" leftIcon={<Share2 />} onClick={share} aria-busy={busy === 'share'}>
              Share
            </Button>
          )}
        </div>
      }
    >
      {/* Paper on a tinted ground, like the saved image, so it stands apart from the sheet */}
      <div className="rounded-card bg-surface-2 p-3 sm:p-4">
        <ReceiptPaper receipt={receiptFor(order)} />
      </div>
    </BottomSheet>
  )
}
