import { useEffect } from "react"
import "./Toast.css"

export type ToastType = "error" | "success" | "info"

type ToastProps = {
  message: string
  type?: ToastType
  onClose: () => void
  durationMs?: number
}

export const Toast = ({ message, type = "error", onClose, durationMs = 4500 }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, durationMs)
    return () => clearTimeout(timer)
  }, [message, onClose, durationMs])

  return (
    <div className={`toast toast--${type}`} role="alert" aria-live="polite">
      <p className="toast__message">{message}</p>
      <button
        type="button"
        className="toast__close"
        onClick={onClose}
        aria-label="Cerrar notificación"
      >
        ×
      </button>
    </div>
  )
}
