// RecordListService.ts
import { apiClient } from '../../services/api/client';
import type { Registro } from '../../types/recordList/Registros';
import {
  ArticuloRegistro,
  LibroRegistro,
  MonografiaRegistro,
  NormaRegistro,
  PatenteRegistro,
  SoftwareRegistro,
  TesisRegistro,
  EventoRegistro,
  PremioRegistro,
} from '../../types/recordList/Registros';

// Mapa de endpoints con sus clases correspondientes
const endpointsMap = {
  articulo: {
    endpoint: '/articles/',
    idField: 'id_article' as const,
    type: 'articulo' as const,
    Class: ArticuloRegistro,
  },
  libro: {
    endpoint: '/books/',
    idField: 'id_book' as const,
    type: 'libro' as const,
    Class: LibroRegistro,
  },
  monografia: {
    endpoint: '/monographs/',
    idField: 'id_monograph' as const,
    type: 'monografia' as const,
    Class: MonografiaRegistro,
  },
  norma: {
    endpoint: '/norms/',
    idField: 'id_norm' as const,
    type: 'norma' as const,
    Class: NormaRegistro,
  },
  patente: {
    endpoint: '/patents/',
    idField: 'id_patent' as const,
    type: 'patente' as const,
    Class: PatenteRegistro,
  },
  software: {
    endpoint: '/softwares/',
    idField: 'id_software' as const,
    type: 'software' as const,
    Class: SoftwareRegistro,
  },
  tesis: {
    endpoint: '/theses/',
    idField: 'id_thesis' as const,
    type: 'tesis' as const,
    Class: TesisRegistro,
  },
  evento: {
    endpoint: '/encounters/',
    idField: 'id_encounter' as const,
    type: 'evento' as const,
    Class: EventoRegistro,
  },
  premio: {
    endpoint: '/prizes/',
    idField: 'id_prize' as const,
    type: 'premio' as const,
    Class: PremioRegistro,
  },
} as const;

export const RecordListService = {
  /**
   * Elimina un registro del backend
   */
  async deleteRecord(recordId: string, tipo: string): Promise<void> {
    const config = Object.values(endpointsMap).find((c) => c.type === tipo);
    if (!config) {
      throw new Error(`Tipo de registro desconocido: ${tipo}`);
    }
    await apiClient.delete(`${config.endpoint}${recordId}/`);
  },

  /**
   * Obtiene todos los registros (sin filtro de autor)
   * Hace peticiones a todos los endpoints y convierte cada respuesta en instancias de las clases correspondientes
   * @param search - Término de búsqueda opcional para filtrar registros
   */
  async fetchAllRecords(search?: string): Promise<Registro[]> {
    const allRecords: Registro[] = [];

    // Iteramos sobre cada tipo de registro
    for (const [key, config] of Object.entries(endpointsMap)) {
      try {
        // Construimos los parámetros de la petición
        const params: Record<string, any> = {};
        if (search && search.trim()) {
          params.search = search.trim();
        }

        // Hacemos la petición al endpoint
        const response = await apiClient.get<any[]>(config.endpoint, {
          params: Object.keys(params).length > 0 ? params : undefined,
        });

        // Convertimos cada item de la respuesta en una instancia de la clase correspondiente
        const items = Array.isArray(response.data) ? response.data : [];
        for (const item of items) {
          try {
            // Creamos una instancia de la clase usando el constructor
            const registro = new config.Class(item as any);
            allRecords.push(registro);
          } catch (error) {
            console.error(`Error creando instancia de ${key} con datos:`, item, error);
          }
        }
      } catch (error) {
        console.warn(`Error fetching ${key}s:`, error);
        // Continuamos con los demás tipos aunque uno falle
      }
    }

    return allRecords;
  },

  /**
   * Obtiene registros filtrados por autor
   * Hace peticiones a todos los endpoints con el filtro de autor y convierte cada respuesta en instancias de las clases correspondientes
   * @param authorId - ID del autor para filtrar registros
   * @param search - Término de búsqueda opcional para filtrar registros
   */
  async fetchRecordsByAuthor(authorId: number, search?: string): Promise<Registro[]> {
    const allRecords: Registro[] = [];

    // Iteramos sobre cada tipo de registro
    for (const [key, config] of Object.entries(endpointsMap)) {
      try {
        // Construimos los parámetros de la petición
        const params: Record<string, any> = { author_id: authorId };
        if (search && search.trim()) {
          params.search = search.trim();
        }

        // Hacemos la petición al endpoint con el filtro de autor y búsqueda
        const response = await apiClient.get<any[]>(config.endpoint, {
          params,
        });

        // Convertimos cada item de la respuesta en una instancia de la clase correspondiente
        const items = Array.isArray(response.data) ? response.data : [];
        for (const item of items) {
          try {
            // Creamos una instancia de la clase usando el constructor
            const registro = new config.Class(item as any);
            allRecords.push(registro);
          } catch (error) {
            console.error(`Error creando instancia de ${key} con datos:`, item, error);
          }
        }
      } catch (error) {
        console.warn(`Error fetching ${key}s for author ${authorId}:`, error);
        // Continuamos con los demás tipos aunque uno falle
      }
    }

    return allRecords;
  },
};