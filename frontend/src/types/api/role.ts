// Tipos para las respuestas de la API de roles

/** Rol en API: FastAPI puede serializar el id como `id_rol` o `id_role`. */
export type RoleApiPayload = {
  id_role?: number;
  id_rol?: number;
  role_name: string;
};

// Rol básico (respuesta de GET /roles/) — siempre normalizado con `id_role`
export interface Role {
  id_role: number;
  role_name: string;
}

// Payload para crear rol
export interface RoleCreate {
  id: number; // id_rol
  role_name: string;
}

// Payload para actualizar rol
export interface RoleUpdate {
  role_name?: string;
}

// Parámetros de filtro para GET /roles/
export interface RoleFilters {
  skip?: number;
  limit?: number;
  search?: string;
}
