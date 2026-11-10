import { apiClient } from "./api/client"
import type { Evaluation } from "../types/api/evaluation"

export const evaluationService = {
  async getEvaluations(params?: { skip?: number; limit?: number }): Promise<Evaluation[]> {
    const response = await apiClient.get<Evaluation[]>("/evaluations/", {
      params: {
        skip: params?.skip ?? 0,
        limit: params?.limit ?? 200,
      },
    })
    return response.data
  },
}
