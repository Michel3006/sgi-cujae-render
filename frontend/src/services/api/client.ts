import axios, { AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import type { ApiError } from '../../types/api/auth';
import { logHttpRequest, logHttpResponseError, logHttpResponseOk } from '../../utils/httpConsoleLogger';

/** Mensaje legible desde respuestas FastAPI (`detail`) u otros formatos. */
export const getMessageFromResponseData = (data: unknown): string => {
  if (data == null || typeof data !== 'object') return 'Error en la petición';
  const d = data as Record<string, unknown>;
  if (typeof d.message === 'string' && d.message.trim()) return d.message;
  const detail = d.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (typeof item === 'object' && item !== null && 'msg' in item) {
        return String((item as { msg?: string }).msg ?? JSON.stringify(item));
      }
      return typeof item === 'string' ? item : JSON.stringify(item);
    });
    return parts.join('; ') || 'Error en la petición';
  }
  return 'Error en la petición';
};

const registerTrace = async (traceData: {
  id_integrant: number;
  method: string | null;
  date: string;
  route: string | null;
  message: string | null;
  response: number | null;
}) => {
  try {
    const { traceService } = await import('../traceService');
    await traceService.createTrace(traceData);
  } catch {
    // Silenciar errores de trazas
  }
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    logHttpRequest('API principal', config);
    return config;
  },
  (error) => {
    console.error('[API principal] Error preparando petición:', error);
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  async (response: AxiosResponse) => {
    logHttpResponseOk('API principal', response);

    const userId = localStorage.getItem('user_id');
    if (userId && response.config.url && !response.config.url.includes('/traces/')) {
      registerTrace({
        id_integrant: parseInt(userId),
        method: response.config.method?.toUpperCase() || null,
        date: new Date().toISOString(),
        route: response.config.url || null,
        message: `Request successful: ${response.config.method} ${response.config.url}`,
        response: response.status,
      }).catch(() => undefined);
    }

    return response;
  },
  async (error: AxiosError<ApiError>) => {
    logHttpResponseError('API principal', error);

    const userId = localStorage.getItem('user_id');
    if (userId && error.config?.url && !error.config.url.includes('/traces/')) {
      registerTrace({
        id_integrant: parseInt(userId),
        method: error.config.method?.toUpperCase() || null,
        date: new Date().toISOString(),
        route: error.config.url || null,
        message: `Request failed: ${error.config.method} ${error.config.url} - Status: ${error.response?.status ?? 'Network Error'}`,
        response: typeof error.response?.status === 'number' ? error.response.status : null,
      }).catch(() => undefined);
    }

    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
      }

      throw new Error(getMessageFromResponseData(data));
    }

    if (error.request) {
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
    }

    throw new Error('Ocurrió un error inesperado');
  },
);

if (import.meta.env.DEV) {
  console.info('[HTTP] Interceptores API principal activos (navegador + Debug Console de Cursor vía Vite)');
}
