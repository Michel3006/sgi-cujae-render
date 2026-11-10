import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import { Toast, type ToastType } from "../components/common/Toast"

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void
  hideToast: () => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const inferToastType = (message: string): ToastType => {
  const normalized = message.toLowerCase()
  if (
    normalized.includes("error") ||
    normalized.includes("debe ") ||
    normalized.includes("corrija") ||
    normalized.includes("complete todos") ||
    normalized.includes("no puede") ||
    normalized.includes("ya está") ||
    normalized.includes("obligatoriamente") ||
    normalized.includes("no hay ")
  ) {
    return "error"
  }
  return "success"
}

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  const hideToast = useCallback(() => {
    setToast(null)
  }, [])

  const showToast = useCallback((message: string, type?: ToastType) => {
    const resolvedType = type ?? inferToastType(message)
    setToast({ message, type: resolvedType })
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast ? (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      ) : null}
    </ToastContext.Provider>
  )
}

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider")
  }
  return context
}
