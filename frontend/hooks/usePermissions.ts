import { useAuthStore } from '../stores/authStore'

export function usePermissions() {
  const { user } = useAuthStore()

  const isAdmin = user?.roles?.includes('admin') || false

  return {
    isAdmin,
    canEdit: isAdmin,
    canDelete: isAdmin
  }
}
