import axios, { AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import { getMessageFromResponseData } from './client';
import { logHttpRequest, logHttpResponseError, logHttpResponseOk } from '../../utils/httpConsoleLogger';

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

export const chatApiClient = axios.create({
  baseURL: import.meta.env.VITE_CHAT_API_BASE_URL || 'http://127.0.0.1:8001',
  headers: {
    'Content-Type': 'application/json',
  },
});

chatApiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    logHttpRequest('Chat API', config);
    return config;
  },
  (error) => {
    console.error('[Chat API] Error preparando petición:', error);
    return Promise.reject(error);
  },
);

chatApiClient.interceptors.response.use(
  async (response: AxiosResponse) => {
    logHttpResponseOk('Chat API', response);

    const userId = localStorage.getItem('user_id');
    if (userId && response.config.url && !response.config.url.includes('/traces/')) {
      registerTrace({
        id_integrant: parseInt(userId),
        method: response.config.method?.toUpperCase() || null,
        date: new Date().toISOString(),
        route: response.config.url || null,
        message: `Chat request successful: ${response.config.method} ${response.config.url}`,
        response: response.status,
      }).catch(() => undefined);
    }

    return response;
  },
  async (error: AxiosError) => {
    logHttpResponseError('Chat API', error);

    const userId = localStorage.getItem('user_id');
    if (userId && error.config?.url && !error.config.url.includes('/traces/')) {
      registerTrace({
        id_integrant: parseInt(userId),
        method: error.config.method?.toUpperCase() || null,
        date: new Date().toISOString(),
        route: error.config.url || null,
        message: `Chat request failed: ${error.config.method} ${error.config.url}`,
        response: typeof error.response?.status === 'number' ? error.response.status : null,
      }).catch(() => undefined);
    }

    if (error.response) {
      throw new Error(getMessageFromResponseData(error.response.data));
    }

    if (error.request) {
      throw new Error('No se pudo conectar con el servidor de chat. Verifica tu conexión.');
    }

    throw new Error('Ocurrió un error inesperado en el chat');
  },
);

if (import.meta.env.DEV) {
  console.info('[HTTP] Interceptores Chat API activos (navegador + Debug Console de Cursor vía Vite)');
}
