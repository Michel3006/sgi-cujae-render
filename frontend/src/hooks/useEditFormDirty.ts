import { useEffect, useRef, useState } from "react"
import { serializeForDirtyCheck } from "../utils/formDirty"

/**
 * Detecta si el formulario de edición difiere del estado inicial cargado.
 * `ready` debe ser false mientras cargan datos async y true cuando el baseline está listo.
 */
export const useEditFormDirty = (ready: boolean, snapshot: unknown): boolean => {
  const initialSerializedRef = useRef<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  const currentSerialized = ready ? serializeForDirtyCheck(snapshot) : null

  useEffect(() => {
    if (!ready) {
      initialSerializedRef.current = null
      setIsDirty(false)
      return
    }

    if (currentSerialized === null) {
      return
    }

    if (initialSerializedRef.current === null) {
      initialSerializedRef.current = currentSerialized
      setIsDirty(false)
      return
    }

    setIsDirty(currentSerialized !== initialSerializedRef.current)
  }, [ready, currentSerialized])

  return isDirty
}
