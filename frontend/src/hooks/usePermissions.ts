import { useAuthStore } from '../stores/authStore';
import type { UserRole } from '../types';

const matchesRole = (userRoles: UserRole[], role: UserRole): boolean => {
  if (userRoles.includes(role)) return true;

  if (role === 'consejo') {
    return userRoles.includes('consejo_cientifico');
  }
  if (role === 'consejo_cientifico') {
    return userRoles.includes('consejo');
  }
  if (role === 'usuario') {
    return userRoles.includes('integrant');
  }
  if (role === 'integrant') {
    return userRoles.includes('usuario');
  }

  return false;
};

/**
 * Hook para gestionar permisos basados en roles.
 * Reglas: Autor → crear/editar sus registros; Consejo → grupos/proyectos; Publicador → Zenodo; Usuario base → solo lectura; Admin → todo.
 */
export const usePermissions = () => {
  const user = useAuthStore((state) => state.user);
  const userRoles = user?.roles ?? [];

  const hasRole = (role: UserRole): boolean => {
    if (!user?.roles?.length) return false;
    return matchesRole(user.roles, role);
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!user?.roles?.length) return false;
    return roles.some((role) => matchesRole(user.roles, role));
  };

  const hasAllRoles = (roles: UserRole[]): boolean => {
    if (!user?.roles?.length) return false;
    return roles.every((role) => matchesRole(user.roles, role));
  };

  const isAdmin = (): boolean => hasRole('admin');

  const isIntegrant = (): boolean => {
    const hasOnlyBaseUser =
      matchesRole(userRoles, 'usuario') || matchesRole(userRoles, 'integrant');
    return (
      hasOnlyBaseUser &&
      !isAdmin() &&
      !isConsejo() &&
      !isAutor() &&
      !isPublicador()
    );
  };

  const isConsejo = (): boolean =>
    hasRole('consejo') || hasRole('consejo_cientifico');

  const isAutor = (): boolean => hasRole('autor_registro');

  const isPublicador = (): boolean => hasRole('publicador');

  /** Solo Autor o Administrador pueden crear registros nuevos. */
  const canCreateRecords = (): boolean => isAdmin() || isAutor();

  /** Solo Consejo Científico o Administrador pueden crear grupos. */
  const canCreateGroups = (): boolean => isAdmin() || isConsejo();

  /** Solo Consejo Científico o Administrador pueden crear proyectos. */
  const canCreateProjects = (): boolean => isAdmin() || isConsejo();

  const canManageAllGroups = (): boolean => isAdmin() || isConsejo();

  const canManageAllProjects = (): boolean => isAdmin() || isConsejo();

  const canManageProjects = (): boolean => {
    return isAdmin() || isConsejo() || hasRole('responsable_proyecto');
  };

  const canManageGroups = (): boolean => {
    return isAdmin() || isConsejo() || hasRole('responsable_grupo');
  };

  const canViewStatistics = (): boolean => isAdmin() || isConsejo();

  const canManageUsers = (): boolean => isAdmin();

  const canViewAuditLog = (): boolean => isAdmin();

  /** Solo Publicador o Administrador pueden publicar registros en Zenodo. */
  const canPublishToZenodo = (): boolean => isAdmin() || isPublicador();

  /** Consejo y usuario base no modifican registros; Admin todos; Autor solo los suyos. */
  const canModifyRecord = (isAuthor: boolean): boolean => {
    if (isAdmin()) return true;
    if (isAutor() && isAuthor) return true;
    return false;
  };

  /** Consejo y usuario base no eliminan registros; Admin todos; Autor solo los suyos. */
  const canDeleteRecord = (isAuthor: boolean): boolean => {
    if (isAdmin()) return true;
    if (isAutor() && isAuthor) return true;
    return false;
  };

  return {
    user,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isAdmin,
    isIntegrant,
    isConsejo,
    isAutor,
    isPublicador,
    canCreateRecords,
    canCreateGroups,
    canCreateProjects,
    canManageAllGroups,
    canManageAllProjects,
    canManageProjects,
    canManageGroups,
    canViewStatistics,
    canManageUsers,
    canViewAuditLog,
    canPublishToZenodo,
    canModifyRecord,
    canDeleteRecord,
  };
};
