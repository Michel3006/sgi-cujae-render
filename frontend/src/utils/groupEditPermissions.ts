import type { IUser } from '../types';

/** ID del integrante autenticado (perfil o localStorage). */
export const getCurrentIntegrantId = (user: IUser | null | undefined): number | null => {
  const fromProfile = user?.id ? parseInt(user.id, 10) : NaN;
  if (!Number.isNaN(fromProfile)) return fromProfile;

  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('user_id');
  if (!stored) return null;
  const parsed = parseInt(stored, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * Puede editar un grupo: ADMIN, CONSEJO o responsable asignado (id_admin / líder).
 * Alineado con la lista de grupos (no basta con ser integrante del grupo).
 */
export const canEditGroupDetails = (
  user: IUser | null | undefined,
  responsableIntegrantId: number | null | undefined,
  isAdminOrConsejo: boolean,
): boolean => {
  if (isAdminOrConsejo) return true;

  const currentId = getCurrentIntegrantId(user);
  const responsableId = responsableIntegrantId ?? 0;
  if (currentId === null || responsableId <= 0) return false;

  return currentId === responsableId;
};

/**
 * Puede reasignar el responsable: administrador del sistema o el responsable actual.
 * En creación (isCreateMode) quien crea el grupo/proyecto puede asignar el responsable inicial.
 */
export const canChangeEntityResponsable = (
  user: IUser | null | undefined,
  responsableIntegrantId: number | null | undefined,
  isSystemAdmin: boolean,
  isCreateMode: boolean,
): boolean => {
  if (isCreateMode) return true;
  if (isSystemAdmin) return true;

  const currentId = getCurrentIntegrantId(user);
  const responsableId = responsableIntegrantId ?? 0;
  if (currentId === null || responsableId <= 0) return false;

  return currentId === responsableId;
};
