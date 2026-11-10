import { apiClient } from './api/client'
import type {
  ResearchTask,
  ResearchTaskCreate,
  ResearchTaskFilters,
  ResearchTaskState,
  ResearchTaskUpdate,
} from '../types/api/researchTask'

export const researchTaskService = {
  async getResearchTasks(filters?: ResearchTaskFilters): Promise<ResearchTask[]> {
    const response = await apiClient.get<ResearchTask[]>('/research-tasks/', {
      params: {
        skip: filters?.skip ?? 0,
        limit: filters?.limit ?? 200,
        project_id: filters?.project_id,
        responsible_id: filters?.responsible_id,
        state_id: filters?.state_id,
        search: filters?.search,
      },
    })
    return Array.isArray(response.data) ? response.data : []
  },

  async getResearchTasksByProjectId(
    projectId: number,
    options?: { skip?: number; limit?: number },
  ): Promise<ResearchTask[]> {
    try {
      const response = await apiClient.get<ResearchTask[]>(
        `/projects/${projectId}/research-tasks`,
        {
          params: {
            skip: options?.skip ?? 0,
            limit: options?.limit ?? 200,
          },
        },
      )
      return Array.isArray(response.data) ? response.data : []
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status !== 404) {
        throw error
      }

      return this.getResearchTasks({
        project_id: projectId,
        skip: options?.skip,
        limit: options?.limit,
      })
    }
  },

  async getResearchTaskById(taskId: number): Promise<ResearchTask> {
    const response = await apiClient.get<ResearchTask>(`/research-tasks/${taskId}`)
    return response.data
  },

  async createResearchTask(data: ResearchTaskCreate): Promise<ResearchTask> {
    const response = await apiClient.post<ResearchTask>('/research-tasks/', data)
    return response.data
  },

  async updateResearchTask(taskId: number, data: ResearchTaskUpdate): Promise<ResearchTask> {
    const response = await apiClient.put<ResearchTask>(`/research-tasks/${taskId}`, data)
    return response.data
  },

  async deleteResearchTask(taskId: number): Promise<ResearchTask> {
    const response = await apiClient.delete<ResearchTask>(`/research-tasks/${taskId}`)
    return response.data
  },

  async getResearchTaskStates(search?: string): Promise<ResearchTaskState[]> {
    const response = await apiClient.get<ResearchTaskState[]>('/research-task-states/', {
      params: {
        search,
        limit: 100,
      },
    })
    return Array.isArray(response.data) ? response.data : []
  },
}
