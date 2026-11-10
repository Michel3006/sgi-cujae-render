import type { IUser, UserRole } from "../types"
import { integrantService } from "./integrantService"
import { roleService } from "./roleService"
import type { IntegrantWithRoles } from "../types/api/integrant"
import {
  buildRoleIdsForPersist,
  mapBackendRoleToUserRole,
  normalizeUserRolesForDisplay,
} from "../utils/userRoleManagement"

const mapIntegrantToIUser = (integrant: IntegrantWithRoles): IUser => {
  const nameParts = integrant.name.split(" ")
  const nombre = nameParts[0] || ""
  const apellidos = nameParts.slice(1).join(" ") || ""

  const roles: UserRole[] = integrant.roles
    ? normalizeUserRolesForDisplay(integrant.roles.map((r) => mapBackendRoleToUserRole(r)))
    : (["usuario"] as UserRole[])

  return {
    id: integrant.id_integrant.toString(),
    nombre,
    apellidos,
    numeroIdentidad: integrant.identity || "",
    correoElectronico: integrant.email || "",
    nombreUsuario: integrant.email?.split("@")[0] || "",
    roles,
    esExterno: integrant.external,
    esAdministrador: roles.includes("admin"),
    telefono: integrant.phone || undefined,
    lugarTrabajo: integrant.work_center || undefined,
    fondoTiempo: integrant.available_time?.toString() || undefined,
    pais: integrant.country?.name || undefined,
    curriculum: integrant.curriculum || undefined,
    facultad: integrant.faculty?.name || undefined,
    area: integrant.faculty_area?.name || undefined,
    categoriaDocente: undefined,
    categoriaCientifica: integrant.cientific_degree?.name as IUser["categoriaCientifica"],
    clasificacionGeneral: integrant.general_category?.name as IUser["clasificacionGeneral"],
    estadoSuperacion: undefined,
    departamento: undefined,
  }
}

class UserService {
  async getAllUsers(): Promise<IUser[]> {
    const integrants = await integrantService.getAllIntegrants({ limit: 1000 })
    return integrants.map(mapIntegrantToIUser)
  }

  async getUserById(userId: string): Promise<IUser> {
    const integrant = await integrantService.getIntegrantById(parseInt(userId, 10))
    return mapIntegrantToIUser(integrant)
  }

  /**
   * Persiste la lista completa de roles del usuario (borrador del modal).
   * Siempre conserva Usuario; Administrador solo si ya lo tenía.
   */
  async saveUserRoles(userId: string, draftRoles: UserRole[]): Promise<IUser> {
    const integrantId = parseInt(userId, 10)
    if (Number.isNaN(integrantId)) {
      throw new Error("Identificador de usuario inválido")
    }

    const [integrant, catalog] = await Promise.all([
      integrantService.getIntegrantById(integrantId),
      roleService.getAllRoles({ limit: 100 }),
    ])

    const hadAdmin = (integrant.roles ?? []).some(
      (r) => mapBackendRoleToUserRole(r) === "admin",
    )

    const roleIds = buildRoleIdsForPersist(
      normalizeUserRolesForDisplay(draftRoles),
      catalog,
      { hadAdmin },
    )

    if (roleIds.length === 0) {
      throw new Error("No se pudo resolver la lista de roles para guardar")
    }

    await integrantService.updateIntegrantRoles(integrantId, roleIds)
    return this.getUserById(userId)
  }
}

export const userService = new UserService()
