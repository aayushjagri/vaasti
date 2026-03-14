import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

type ToastFn = (message: string, type?: ToastType) => void

let _addToast: ToastFn | null = null

export function toast(message: string, type: ToastType = 'success') {
  _addToast?.(message, type)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  useEffect(() => {
    _addToast = addToast
    return () => { _addToast = null }
  }, [addToast])

  const icons = {
    success: <CheckCircle2 size={16} className="text-status-paid" />,
    error: <AlertCircle size={16} className="text-status-overdue" />,
    info: <Info size={16} className="text-status-vacant" />,
  }

  const colors = {
    success: 'border-status-paid/30 bg-status-paid/10',
    error: 'border-status-overdue/30 bg-status-overdue/10',
    info: 'border-status-vacant/30 bg-status-vacant/10',
  }

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border ${colors[t.type]} backdrop-blur-sm animate-slide-down shadow-elevated`}
        >
          <span className="mt-0.5 flex-shrink-0">{icons[t.type]}</span>
          <span className="text-sm text-white flex-1">{t.message}</span>
          <button
            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            className="text-slate-500 hover:text-white flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
