import { apiClient } from './api/client';
import type {
  Role,
  RoleApiPayload,
  RoleCreate,
  RoleUpdate,
  RoleFilters,
} from '../types/api/role';

const normalizeRoleFromApi = (raw: RoleApiPayload): Role | null => {
  const id = raw.id_role ?? raw.id_rol;
  if (id == null || !Number.isFinite(Number(id))) {
    return null;
  }
  return {
    id_role: Number(id),
    role_name: raw.role_name,
  };
};

export const roleService = {
  /**
   * Obtiene todos los roles con filtros opcionales
   */
  async getAllRoles(filters?: RoleFilters): Promise<Role[]> {
    const response = await apiClient.get<RoleApiPayload[]>('/roles/', {
      params: {
        skip: filters?.skip ?? 0,
        limit: filters?.limit ?? 100,
        search: filters?.search,
      },
    });
    return response.data
      .map(normalizeRoleFromApi)
      .filter((role): role is Role => role !== null);
  },

  /**
   * Obtiene un rol por su ID
   */
  async getRoleById(roleId: number): Promise<Role> {
    const response = await apiClient.get<RoleApiPayload>(`/roles/${roleId}`);
    const role = normalizeRoleFromApi(response.data);
    if (!role) {
      throw new Error('Rol inválido en la respuesta del servidor');
    }
    return role;
  },

  /**
   * Crea un nuevo rol
   */
  async createRole(role: RoleCreate): Promise<Role> {
    const response = await apiClient.post<Role>('/roles/', role);
    return response.data;
  },

  /**
   * Actualiza un rol existente
   */
  async updateRole(roleId: number, role: RoleUpdate): Promise<Role> {
    const response = await apiClient.put<Role>(`/roles/${roleId}`, role);
    return response.data;
  },

  /**
   * Elimina un rol
   */
  async deleteRole(roleId: number): Promise<Role> {
    const response = await apiClient.delete<Role>(`/roles/${roleId}`);
    return response.data;
  },
};

