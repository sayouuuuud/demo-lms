'use client'

import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'حذف',
  cancelLabel = 'إلغاء',
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} className="max-w-sm">
      <div className="flex justify-start gap-2">
        <Button
          variant="destructive"
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {confirmLabel}
        </Button>
        <Button variant="outline" onClick={onClose}>
          {cancelLabel}
        </Button>
      </div>
    </Modal>
  )
}
