import { apiClient } from "./api/client"
import type {
  IntegrantGroupEvaluation,
  IntegrantGroupEvaluationCreate,
  IntegrantGroupEvaluationUpdate,
} from "../types/api/integrantGroupEvaluation"

export const integrantGroupEvaluationService = {
  async getByFilters(params: {
    id_group?: number
    id_integrant?: number
    id_evaluation?: number
    skip?: number
    limit?: number
  }): Promise<IntegrantGroupEvaluation[]> {
    const query: Record<string, number> = {
      skip: params.skip ?? 0,
      limit: params.limit ?? 200,
    }
    if (params.id_group != null) query.id_group = params.id_group
    if (params.id_integrant != null) query.id_integrant = params.id_integrant
    if (params.id_evaluation != null) query.id_evaluation = params.id_evaluation

    const response = await apiClient.get<IntegrantGroupEvaluation[]>("/integrant-group-evaluations/", {
      params: query,
    })
    return response.data
  },

  async create(payload: IntegrantGroupEvaluationCreate): Promise<IntegrantGroupEvaluation> {
    const response = await apiClient.post<IntegrantGroupEvaluation>("/integrant-group-evaluations/", payload)
    return response.data
  },

  async update(id: number, payload: IntegrantGroupEvaluationUpdate): Promise<IntegrantGroupEvaluation> {
    const response = await apiClient.put<IntegrantGroupEvaluation>(
      `/integrant-group-evaluations/${id}`,
      payload,
    )
    return response.data
  },

  async remove(id: number): Promise<IntegrantGroupEvaluation> {
    const response = await apiClient.delete<IntegrantGroupEvaluation>(`/integrant-group-evaluations/${id}`)
    return response.data
  },
}
