import { apiClient } from './api/client';
import type {
  IntegrantWithRoles,
  IntegrantGet,
  IntegrantCreate,
  IntegrantUpdate,
  IntegrantFilters,
} from '../types/api/integrant';

export const integrantService = {
  /**
   * Obtiene todos los integrantes con filtros opcionales
   */
  async getAllIntegrants(filters?: IntegrantFilters): Promise<IntegrantWithRoles[]> {
    const response = await apiClient.get<IntegrantWithRoles[]>('/integrants/', {
      params: {
        skip: filters?.skip ?? 0,
        limit: filters?.limit ?? 100,
        search: filters?.search,
      },
    });
    return response.data;
  },

  /**
   * Obtiene un integrante por su ID
   */
  async getIntegrantById(integrantId: number): Promise<IntegrantWithRoles> {
    const response = await apiClient.get<IntegrantWithRoles>(`/integrants/${integrantId}`);
    return response.data;
  },

  /**
   * Crea un nuevo integrante
   */
  async createIntegrant(integrant: IntegrantCreate): Promise<IntegrantGet> {
    const response = await apiClient.post<IntegrantGet>('/integrants/', integrant);
    return response.data;
  },

  /**
   * Actualiza un integrante existente
   */
  async updateIntegrant(integrantId: number, integrant: IntegrantUpdate): Promise<IntegrantGet> {
    const response = await apiClient.put<IntegrantGet>(`/integrants/${integrantId}`, integrant);
    return response.data;
  },

  /**
   * Elimina un integrante
   */
  async deleteIntegrant(integrantId: number): Promise<IntegrantGet> {
    const response = await apiClient.delete<IntegrantGet>(`/integrants/${integrantId}`);
    return response.data;
  },

  /**
   * Actualiza los roles del integrante enviando la lista completa de role_ids
   */
  async updateIntegrantRoles(integrantId: number, roleIds: number[]): Promise<IntegrantGet> {
    const validRoleIds = roleIds.filter(
      (id) => typeof id === 'number' && Number.isFinite(id),
    );
    if (validRoleIds.length === 0) {
      throw new Error('La lista de roles no contiene identificadores válidos');
    }
    return this.updateIntegrant(integrantId, { roles_list: validRoleIds });
  },

  /**
   * Modifica los roles del integrante enviando roles_list con el nuevo rol
   * Envía PUT a /integrants/{id} con body: { roles_list: [id_del_rol] }
   */
};
