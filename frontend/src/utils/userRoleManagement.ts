import type { UserRole } from '../types'
import type { Role, RoleApiPayload } from '../types/api/role'

/** IDs conocidos en el backend (authService / permisos). */
const FALLBACK_ROLE_IDS: Partial<Record<UserRole, number>> = {
  admin: 1,
  usuario: 2,
  consejo: 3,
  autor_registro: 4,
}

export const getRoleNumericId = (role: RoleApiPayload): number | undefined => {
  const id = role.id_role ?? role.id_rol
  if (id == null || !Number.isFinite(Number(id))) {
    return undefined
  }
  return Number(id)
}

/** Roles que un administrador puede asignar o quitar. */
export const ASSIGNABLE_USER_ROLES: UserRole[] = ['consejo', 'autor_registro', 'publicador']

/** Roles fijos: no se agregan ni eliminan desde la UI. */
export const LOCKED_USER_ROLES: UserRole[] = ['admin', 'usuario']

export const ROLE_DISPLAY_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  integrant: 'Usuario',
  consejo: 'Consejo Científico',
  responsable_proyecto: 'Responsable de Proyecto',
  responsable_grupo: 'Responsable de Grupo',
  integrante_proyecto: 'Integrante de Proyecto',
  integrante_grupo: 'Integrante de Grupo',
  consejo_cientifico: 'Consejo Científico',
  autor_registro: 'Autor',
  publicador: 'Publicador',
  usuario: 'Usuario',
}

const ROLE_DISPLAY_ORDER: UserRole[] = [
  'admin',
  'consejo',
  'autor_registro',
  'publicador',
  'usuario',
  'responsable_grupo',
  'responsable_proyecto',
  'integrante_grupo',
  'integrante_proyecto',
  'integrant',
  'consejo_cientifico',
]

/** Mapeo backend → frontend (USUARIO siempre como `usuario`). */
export const mapBackendRoleToUserRole = (role: RoleApiPayload): UserRole => {
  const roleId = getRoleNumericId(role)
  const roleName = role.role_name.toUpperCase().trim()
  const normalized = role.role_name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')

  if (roleId === 1 || roleName === 'ADMIN' || roleName === 'ADMINISTRADOR') return 'admin'
  if (roleId === 2 || roleName === 'USUARIO' || roleName === 'INTEGRANT') return 'usuario'
  if (roleId === 3 || roleName === 'CONSEJO' || roleName.includes('CONSEJO')) return 'consejo'
  if (roleId === 4 || roleName === 'AUTOR') return 'autor_registro'
  if (roleName === 'PUBLICADOR') return 'publicador'

  const roleMap: Record<string, UserRole> = {
    responsable_proyecto: 'responsable_proyecto',
    responsable_grupo: 'responsable_grupo',
    integrante_proyecto: 'integrante_proyecto',
    integrante_grupo: 'integrante_grupo',
    consejo_cientifico: 'consejo',
    autor_registro: 'autor_registro',
    publicador: 'publicador',
    usuario: 'usuario',
    admin: 'admin',
    integrant: 'usuario',
  }

  return roleMap[normalized] ?? 'usuario'
}

export const isLockedUserRole = (role: UserRole): boolean =>
  role === 'admin' || role === 'usuario' || role === 'integrant'

export const normalizeUserRolesForDisplay = (roles: UserRole[]): UserRole[] => {
  const bucket = new Set<UserRole>()

  roles.forEach((role) => {
    if (role === 'integrant' || role === 'usuario') {
      bucket.add('usuario')
      return
    }
    if (role === 'consejo_cientifico') {
      bucket.add('consejo')
      return
    }
    bucket.add(role)
  })

  if (bucket.size === 0) {
    bucket.add('usuario')
  }

  return ROLE_DISPLAY_ORDER.filter((role) => bucket.has(role))
}

export const getAddableRolesForDraft = (draftRoles: UserRole[]): UserRole[] =>
  ASSIGNABLE_USER_ROLES.filter((role) => !draftRoles.includes(role))

export const findBackendRoleByUserRole = (
  catalog: Role[],
  userRole: UserRole,
): Role | undefined => {
  if (userRole === 'usuario' || userRole === 'integrant') {
    return catalog.find(
      (r) =>
        getRoleNumericId(r) === 2 ||
        mapBackendRoleToUserRole(r) === 'usuario' ||
        r.role_name.toUpperCase() === 'USUARIO',
    )
  }

  if (userRole === 'consejo' || userRole === 'consejo_cientifico') {
    return catalog.find((r) => {
      const mapped = mapBackendRoleToUserRole(r)
      return mapped === 'consejo' || getRoleNumericId(r) === 3
    })
  }

  return catalog.find((r) => mapBackendRoleToUserRole(r) === userRole)
}

const resolveRoleIdForPersist = (userRole: UserRole, catalog: Role[]): number | undefined => {
  const backendRole = findBackendRoleByUserRole(catalog, userRole)
  const fromCatalog = backendRole ? getRoleNumericId(backendRole) : undefined
  if (fromCatalog != null) {
    return fromCatalog
  }
  return FALLBACK_ROLE_IDS[userRole]
}

/**
 * Construye la lista de IDs para `roles_list` preservando Usuario y Admin (si ya lo tenía).
 */
export const buildRoleIdsForPersist = (
  draftRoles: UserRole[],
  catalog: Role[],
  options: { hadAdmin: boolean },
): number[] => {
  const targetRoles = new Set<UserRole>()
  targetRoles.add('usuario')
  if (options.hadAdmin) {
    targetRoles.add('admin')
  }

  draftRoles.forEach((role) => {
    if (isLockedUserRole(role)) return
    if (role === 'consejo_cientifico') {
      targetRoles.add('consejo')
      return
    }
    targetRoles.add(role)
  })

  const ids = new Set<number>()
  targetRoles.forEach((userRole) => {
    const roleId = resolveRoleIdForPersist(userRole, catalog)
    if (roleId != null) {
      ids.add(roleId)
    }
  })

  const usuarioId = resolveRoleIdForPersist('usuario', catalog)
  if (usuarioId != null) {
    ids.add(usuarioId)
  }

  if (options.hadAdmin) {
    const adminId = resolveRoleIdForPersist('admin', catalog)
    if (adminId != null) {
      ids.add(adminId)
    }
  }

  return [...ids].filter((id) => Number.isFinite(id))
}
