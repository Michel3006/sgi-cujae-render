import { apiClient } from './api/client';
import type {
  Project,
  ProjectWithMembers,
  ProjectUpdate,
  ProjectFilters,
  ProjectClassification,
  ProjectState,
  ProjectType,
} from '../types/api/project';

export interface NewIntegrantPayload {
  name: string
  work_center?: string | null
  email?: string | null
  identity?: string | null
  id_country?: number | null
}

export interface CreateProjectPayload {
  title: string
  code: string
  scientific_details?: string | null
  other_data?: string | null
  keywords: string
  member_ids: Array<number | NewIntegrantPayload>
  id_responsible: number | null
  thematic: string
  id_project_type: number | null
  art_state: string
  cientific_problem: string | null
  study_object: string | null
  study_field: string
  hypothesis: string
  main_objective: string | null
  research_methods: string
  interested_third_party: string | null
  national_group: string
  international_group: string | null
  publish_magazine: string | null
  participate_events: string | null
  citma_code: string | null
  minvec_code: string | null
  approved: boolean
  conseil_criteria: string
  initial_date: string
  final_date: string | null
  update_date: string
  id_project_state: number | null
  id_project_classification: number | null
  economic_budget: string
  economic_needs: string | null
  id_faculty: number | null
  concluded: boolean
  approved_date: string | null
  general_budget_cup: string | null
  year_budget_cup: string | null
  is_international: boolean
  is_national: boolean
  is_territorial: boolean
  is_cujae: boolean
}

export const projectService = {
  /**
   * Obtiene todos los proyectos con filtros opcionales
   */
  async getAllProjects(filters?: ProjectFilters): Promise<Project[]> {
    const response = await apiClient.get<Project[]>('/projects/', {
      params: {
        skip: filters?.skip ?? 0,
        limit: filters?.limit ?? 100,
        responsible_id: filters?.responsible_id,
        group_id: filters?.group_id,
        search: filters?.search,
      },
    });
    const data = response.data;
    return Array.isArray(data) ? data : [];
  },

  /**
   * Obtiene un proyecto por su ID (con miembros)
   */
  async getProjectById(projectId: number): Promise<ProjectWithMembers> {
    const response = await apiClient.get<ProjectWithMembers>(`/projects/${projectId}`);
    return response.data;
  },

  /**
   * Crea un nuevo proyecto
   */
  async createProject(data: CreateProjectPayload): Promise<Project> {
    const response = await apiClient.post<Project>('/projects/', data);
    return response.data;
  },
  async updateProject(projectId: number, project: ProjectUpdate): Promise<Project> {
    const response = await apiClient.put<Project>(`/projects/${projectId}`, project);
    return response.data;
  },
  async updateProjectWithPayload(projectId: number, data: CreateProjectPayload): Promise<Project> {
    const response = await apiClient.put<Project>(`/projects/${projectId}`, data);
    return response.data;
  },

  async deleteProject(projectId: number): Promise<Project> {
    const response = await apiClient.delete<Project>(`/projects/${projectId}`);
    return response.data;
  },

  /**
   * Obtiene todas las clasificaciones de proyectos
   */
  async getProjectClassifications(search?: string): Promise<ProjectClassification[]> {
    const response = await apiClient.get<ProjectClassification[]>('/project-classifications/', {
      params: {
        search,
        limit: 100,
      },
    });
    return response.data;
  },

  /**
   * Obtiene todos los estados de proyectos
   */
  async getProjectStates(search?: string): Promise<ProjectState[]> {
    const response = await apiClient.get<ProjectState[]>('/project-states/', {
      params: {
        search,
        limit: 100,
      },
    });
    return response.data;
  },

  /**
   * Obtiene todos los tipos de proyectos
   */
  async getProjectTypes(search?: string): Promise<ProjectType[]> {
    const response = await apiClient.get<ProjectType[]>('/project-types/', {
      params: {
        search,
        limit: 100,
      },
    });
    return response.data;
  },
};

