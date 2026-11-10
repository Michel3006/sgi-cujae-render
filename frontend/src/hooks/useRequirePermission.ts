import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Redirige si el usuario no cumple el permiso (p. ej. acceso directo por URL).
 */
export const useRequirePermission = (
  allowed: boolean,
  redirectTo = '/dashboard',
): void => {
  const navigate = useNavigate()

  useEffect(() => {
    if (!allowed) {
      navigate(redirectTo, { replace: true })
    }
  }, [allowed, navigate, redirectTo])
}
