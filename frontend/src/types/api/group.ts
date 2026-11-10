// Tipos para las respuestas de la API de grupos

// Resumen de integrante (líder/responsable)
export interface IntegrantSummary {
  id_integrant: number;
  name: string;
  email?: string;
}

// Facultad
export interface Faculty {
  id_faculty: number;
  name: string;
}

// Área de facultad
export interface FacultyArea {
  id_faculty_area: number;
  name: string;
}

// Miembro del grupo (con campo admin de la tabla intermedia)
export interface GroupMember {
  id_integrant: number;
  name: string;
  admin: boolean; // Campo de la tabla intermedia group_integrant
  integrant?: IntegrantSummary; // Opcional, puede venir en algunas respuestas
}

// Grupo básico (respuesta de GET /groups/)
export interface Group {
  id_group: number;
  name: string;
  subjects: string; // Temáticas separadas por comas o algún delimitador
  problems: string; // Descripción/problemas
  id_faculty_area?: number | null;
  id_integrant?: number; // Líder/responsable (legacy, puede no venir)
  id_admin?: number; // ID del responsable/admin del grupo
  id_faculty: number;
  create_date: string;
  update_date: string;
  // Relaciones (pueden venir o no dependiendo del schema)
  leader?: IntegrantSummary | null;
  faculty?: Faculty | null;
  faculty_area?: FacultyArea | null;
  members?: GroupMember[]; // Miembros del grupo
}

// Payload para crear grupo
export interface GroupCreate {
  name: string;
  subjects: string;
  problems: string;
  id_faculty_area?: number | null;
  id_integrant: number;
  id_faculty: number;
  create_date?: string; // Opcional, el backend lo asigna si no se pasa
  update_date?: string; // Opcional, el backend lo asigna si no se pasa
}

// Payload para actualizar grupo
export interface GroupUpdate {
  name?: string;
  subjects?: string;
  problems?: string;
  id_faculty_area?: number | null;
  id_integrant?: number;
  id_faculty?: number;
  update_date?: string;
}

// Parámetros de filtro para GET /groups/
export interface GroupFilters {
  skip?: number;
  limit?: number;
  search?: string;
  id_admin?: number;
}

