import { AlertTriangle, Loader2 } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm',
  danger = false, loading = false, onConfirm, onCancel
}: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-sm p-6">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-status-overdue/15' : 'bg-gold/15'}`}>
            <AlertTriangle size={20} className={danger ? 'text-status-overdue' : 'text-gold'} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>{title}</h3>
            <p className="text-sm text-slate-400">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onCancel} disabled={loading} className="btn-ghost text-sm">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={danger ? 'btn-danger text-sm' : 'btn-primary text-sm'}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
