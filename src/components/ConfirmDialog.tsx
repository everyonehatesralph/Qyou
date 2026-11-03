import type { ReactNode } from 'react'
import { BottomSheet, Button } from './ui'

interface Props {
  open: boolean
  title: ReactNode
  body?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}

/** Two-button confirmation, as a bottom sheet on phones and a dialog from 768px. */
export default function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel = 'Cancel', danger, onConfirm, onClose }: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title} description={body}>
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button onClick={onClose}>{cancelLabel}</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </BottomSheet>
  )
}
