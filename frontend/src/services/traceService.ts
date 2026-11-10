import { apiClient } from './api/client';

/** Tamaño de página alineado con la paginación del backend (`skip` / `limit`). */
export const TRACE_PAGE_SIZE = 20;

// Tipo para crear una traza
export interface TraceCreate {
  id_integrant: number;
  method: string | null;
  date: string | null; // ISO 8601
  route: string | null;
  message: string | null;
  /** Código HTTP de la petición trazada (coincide con `TraceCreate` del backend). */
  response: number | null;
}

// Tipo para la respuesta de traza
export interface Trace {
  id_trace?: number;
  id_integrant: number;
  method: string | null;
  date: string | null;
  route: string | null;
  message: string | null;
  response: number | null;
  integrant?: {
    id_integrant: number;
    name: string;
    email?: string;
  };
}

export type TraceDateOrder = 'asc' | 'desc';

// Filtros para obtener trazas (parámetros de GET /traces/)
export interface TraceFilters {
  start_date?: string; // ISO 8601
  end_date?: string; // ISO 8601
  skip?: number;
  limit?: number;
  integrant_id?: number;
  route?: string;
  method?: string;
  date_order?: TraceDateOrder;
}

export interface TracePageResult {
  items: Trace[];
  hasMore: boolean;
}

/** Mapea el filtro de UI «tipo de acción» al método HTTP del backend. */
export const mapTipoAccionToHttpMethod = (
  tipoAccion: string,
): string | undefined => {
  switch (tipoAccion) {
    case 'crear':
      return 'POST';
    case 'modificar':
      return 'PUT';
    case 'eliminar':
      return 'DELETE';
    case 'consultar':
      return 'GET';
    default:
      return undefined;
  }
};

export const traceService = {
  /**
   * Crea una nueva traza
   */
  async createTrace(trace: TraceCreate): Promise<Trace> {
    try {
      const response = await apiClient.post<Trace>('/traces/', trace);
      return response.data;
    } catch (error) {
      console.error('Error creando traza:', error);
      throw error;
    }
  },

  /**
   * Obtiene una página de trazas (más recientes primero por defecto).
   */
  async getTracesPage(filters?: TraceFilters): Promise<TracePageResult> {
    const limit = filters?.limit ?? TRACE_PAGE_SIZE;
    const skip = filters?.skip ?? 0;

    const response = await apiClient.get<Trace[]>('/traces/', {
      params: {
        skip,
        limit,
        start_date: filters?.start_date,
        end_date: filters?.end_date,
        integrant_id: filters?.integrant_id,
        route: filters?.route,
        method: filters?.method,
        date_order: filters?.date_order ?? 'desc',
      },
    });

    const items = response.data;
    return {
      items,
      hasMore: items.length === limit,
    };
  },

  /** @deprecated Usar getTracesPage para paginación incremental. */
  async getAllTraces(filters?: TraceFilters): Promise<Trace[]> {
    const { items } = await traceService.getTracesPage({
      ...filters,
      limit: filters?.limit ?? 100,
      skip: filters?.skip ?? 0,
      date_order: filters?.date_order ?? 'desc',
    });
    return items;
  },
};
