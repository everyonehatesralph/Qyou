import { useCallback, useMemo, useState } from 'react'
import type { Order, OrderStatus } from '../context/OrderContext'
import { RESTAURANT } from '../config/restaurant'
import { STATUS_META } from '../theme/status'
import { peso } from '../utils/formatters'
import { buildReceipt, receiptFileName, type Receipt } from '../services/receipt'
import { announce } from '../components/ui'

/** The receipt for one of this phone's orders, as the receipt view and the image show it. */
export function receiptFor(order: Order): Receipt {
  return buildReceipt(order, {
    place: RESTAURANT.name,
    money: n => peso(n),
    statusLabel: s => STATUS_META[s as OrderStatus]?.customerLabel ?? s,
  })
}

async function receiptFile(order: Order): Promise<File> {
  const receipt = receiptFor(order)
  // The drawing code loads on first use only
  const { receiptPng } = await import('../services/receiptImage')
  const blob = await receiptPng(receipt, RESTAURANT.logoText)
  return new File([blob], receiptFileName(RESTAURANT.shortName, receipt.ref), { type: 'image/png' })
}

/** Whether this browser can hand an image to the phone's share sheet. */
function canShareImages(): boolean {
  try {
    return typeof navigator.share === 'function' &&
      !!navigator.canShare?.({ files: [new File([new Uint8Array(1)], 'receipt.png', { type: 'image/png' })] })
  } catch {
    return false
  }
}

/** Download receipt (a PNG saved to the phone) and, where the browser can, Share. */
export function useReceipt(order: Order | undefined) {
  const [busy, setBusy] = useState<'download' | 'share' | null>(null)
  const canShare = useMemo(canShareImages, [])

  const download = useCallback(async () => {
    if (!order || busy) return
    setBusy('download')
    try {
      const file = await receiptFile(order)
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = file.name
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      announce('Your receipt is downloading as an image.')
    } catch {
      announce('The receipt could not be saved. Try again.')
    } finally {
      setBusy(null)
    }
  }, [order, busy])

  const share = useCallback(async () => {
    if (!order || busy) return
    setBusy('share')
    try {
      const file = await receiptFile(order)
      await navigator.share({ files: [file], title: `Receipt · ${RESTAURANT.name}` })
    } catch (e) {
      // Closing the share sheet is not an error
      if (!(e instanceof DOMException && e.name === 'AbortError')) announce('The receipt could not be shared. Try Download instead.')
    } finally {
      setBusy(null)
    }
  }, [order, busy])

  return { download, share, canShare, busy }
}
