// Tipos para las respuestas de la API de integrantes (usuarios)

// Rol básico
export interface Role {
  id_role: number;
  role_name: string;
}

// Integrante con roles (respuesta de GET /integrants/)
export interface IntegrantWithRoles {
  id_integrant: number;
  name: string;
  identity?: string | null;
  external: boolean;
  email?: string | null;
  phone?: string | null;
  available_time?: number | null;
  work_center?: string | null;
  curriculum?: string | null;
  id_faculty_area?: number | null;
  id_cientific_degree?: number | null;
  id_country?: number | null;
  id_faculty?: number | null;
  id_docent_degree?: number | null;
  id_general_category?: number | null;
  // Relaciones
  roles?: Role[];
  country?: {
    id_country: number;
    name: string;
  } | null;
  docent_degree?: {
    id_docent_degree: number;
    name: string;
  } | null;
  cientific_degree?: {
    id_cientific_degree: number;
    name: string;
  } | null;
  faculty?: {
    id_faculty: number;
    name: string;
  } | null;
  faculty_area?: {
    id_faculty_area: number;
    name: string;
  } | null;
  general_category?: {
    id_general_category: number;
    name: string;
  } | null;
}

// Integrante básico (sin roles)
export interface IntegrantGet {
  id_integrant: number;
  name: string;
  identity?: string | null;
  external: boolean;
  email?: string | null;
  phone?: string | null;
  available_time?: number | null;
  work_center?: string | null;
  curriculum?: string | null;
  id_faculty_area?: number | null;
  id_cientific_degree?: number | null;
  id_country?: number | null;
  id_faculty?: number | null;
  id_docent_degree?: number | null;
  id_general_category?: number | null;
}

// Payload para crear integrante
export interface IntegrantCreate {
  name: string;
  identity?: string | null;
  external?: boolean;
  email?: string | null;
  phone?: string | null;
  available_time?: number | null;
  work_center?: string | null;
  curriculum?: string | null;
  id_faculty_area?: number | null;
  id_cientific_degree?: number | null;
  id_country?: number | null;
  id_faculty?: number | null;
  id_docent_degree?: number | null;
  id_general_category?: number | null;
  role_ids?: number[];
}

// Payload para actualizar integrante
export interface IntegrantUpdate {
  name?: string;
  identity?: string | null;
  external?: boolean;
  email?: string | null;
  phone?: string | null;
  available_time?: number | null;
  work_center?: string | null;
  curriculum?: string | null;
  id_faculty_area?: number | null;
  id_cientific_degree?: number | null;
  id_country?: number | null;
  id_faculty?: number | null;
  id_docent_degree?: number | null;
  id_general_category?: number | null;
  role_ids?: number[];
  roles_list?: number[];
}

// Parámetros de filtro para GET /integrants/
export interface IntegrantFilters {
  skip?: number;
  limit?: number;
  search?: string;
}
