export interface ResearchTaskState {
  id_research_task_state: number
  name: string | null
}

export interface IntegrantSummary {
  id_integrant: number
  name: string
}

export interface ResearchTask {
  id_research_task: number
  name: string | null
  description: string | null
  id_responsible: number | null
  responsible?: IntegrantSummary | null
  initial_date: string | null
  final_date: string | null
  id_project: number | null
  sort_order: number
  id_research_task_state: number | null
  compliance_report: string | null
  remote_task: boolean
  estimation_time: number | null
  execution_time: number | null
  state?: ResearchTaskState | null
}

export interface ResearchTaskCreate {
  name?: string | null
  description?: string | null
  id_responsible?: number | null
  initial_date?: string | null
  final_date?: string | null
  id_project?: number | null
  sort_order?: number
  id_research_task_state?: number | null
  compliance_report?: string | null
  remote_task?: boolean
  estimation_time?: number | null
  execution_time?: number | null
}

export interface ResearchTaskUpdate extends ResearchTaskCreate {}

export interface ResearchTaskFilters {
  skip?: number
  limit?: number
  project_id?: number
  responsible_id?: number
  state_id?: number
  search?: string
}
