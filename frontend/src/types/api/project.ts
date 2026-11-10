// Tipos para las respuestas de la API de proyectos

// Resumen de integrante (responsable)
export interface IntegrantSummary {
  id_integrant: number;
  name: string;
  email?: string;
}

// Estado de proyecto
export interface ProjectState {
  id_project_state: number;
  name: string;
}

// Tipo de proyecto
export interface ProjectType {
  id_project_type: number;
  name: string;
}

// Clasificación de proyecto
export interface ProjectClassification {
  id_project_classification: number;
  name: string | null;
  code?: string | null;
}

// Proyecto básico (respuesta de GET /projects/)
export interface Project {
  id_project: number;
  title: string;
  code?: string | null;
  keywords?: string | null;
  thematic?: string | null; // Temática del proyecto
  national_group?: string | null; // Grupo nacional
  international_group?: string | null; // Grupo internacional
  description?: string | null;
  cientific_problem?: string | null; // Problema científico
  study_object?: string | null;
  study_field?: string | null;
  hypothesis?: string | null;
  objectives?: string | null;
  main_objective?: string | null; // Objetivo principal
  research_methods?: string | null;
  interested_third_party?: string | null;
  tasks?: string | null;
  scientific_details?: string | null;
  other_data?: string | null;
  council_criteria?: string | null;
  conseil_criteria?: string | null; // Alias para council_criteria
  publish_magazine?: string | null;
  participate_events?: string | null;
  citma_code?: string | null;
  minvec_code?: string | null;
  art_state?: string | null;
  initial_date?: string | null;
  final_date?: string | null;
  start_date?: string | null; // Alias para initial_date
  end_date?: string | null; // Alias para final_date
  update_date?: string | null;
  is_prioritized?: boolean;
  is_approved?: boolean;
  approved?: boolean; // Alias para is_approved
  concluded?: boolean;
  approved_date?: string | null;
  id_responsible: number;
  responsible?: IntegrantSummary | null;
  id_classification?: number | null;
  id_project_classification?: number | null; // Alias
  classification?: ProjectClassification | null;
  project_classification?: ProjectClassification | null; // Alias
  id_state?: number | null;
  id_project_state?: number | null; // Alias
  state?: ProjectState | null;
  project_state?: ProjectState | null; // Alias
  id_type?: number | null;
  id_project_type?: number | null; // Alias
  type?: ProjectType | null;
  project_type?: ProjectType | null; // Alias
  id_group?: number | null;
  group?: {
    id_group: number;
    name: string;
  } | null;
  faculty?: {
    id_faculty: number;
    name: string;
  } | null;
  id_faculty?: number | null;
  economic_budget?: string | null;
  economic_needs?: string | null;
  general_budget_cup?: string | null;
  year_budget_cup?: string | null;
  is_international?: boolean;
  is_national?: boolean;
  is_territorial?: boolean;
  is_cujae?: boolean;
}

// Miembro del proyecto
export interface ProjectMember {
  id_project_member: number;
  id_project: number;
  id_integrant: number;
  integrant?: IntegrantSummary;
  has_administrative_permission: boolean;
  entry_date: string;
}

// Proyecto con miembros (respuesta de GET /projects/{id})
export interface ProjectWithMembers extends Project {
  members?: ProjectMember[];
}

// Payload para crear proyecto
export interface ProjectCreate {
  title: string;
  code?: string | null;
  description?: string | null;
  objectives?: string | null;
  tasks?: string | null;
  scientific_details?: string | null;
  other_data?: string | null;
  council_criteria?: string | null;
  start_date: string;
  end_date?: string | null;
  is_prioritized: boolean;
  is_approved: boolean;
  id_responsible: number;
  id_classification?: number | null;
  id_state: number;
  id_type?: number | null;
  id_group?: number | null;
}

// Payload para actualizar proyecto
export interface ProjectUpdate {
  title?: string;
  code?: string | null;
  description?: string | null;
  objectives?: string | null;
  tasks?: string | null;
  scientific_details?: string | null;
  other_data?: string | null;
  council_criteria?: string | null;
  start_date?: string;
  end_date?: string | null;
  is_prioritized?: boolean;
  is_approved?: boolean;
  id_responsible?: number;
  id_classification?: number | null;
  id_state?: number;
  id_type?: number | null;
  id_group?: number | null;
}

// Parámetros de filtro para GET /projects/
export interface ProjectFilters {
  skip?: number;
  limit?: number;
  responsible_id?: number;
  group_id?: number;
  search?: string;
}

