const DEBUG_LOG_PATH = '/__api-debug-log';

export type ApiDebugLogPayload = {
  kind: 'request' | 'response' | 'error';
  client: string;
  method: string;
  url: string;
  status?: number | null;
  statusText?: string | null;
  headers?: unknown;
  params?: unknown;
  body?: unknown;
  data?: unknown;
  message?: string;
};

export const serializeBodyForDebug = (body: unknown): unknown => {
  if (body instanceof FormData) {
    const entries: Record<string, unknown> = {};
    body.forEach((value, key) => {
      entries[key] = value instanceof File ? `[File name=${value.name} size=${value.size}]` : value;
    });
    return entries;
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }

  return body;
};

/**
 * Reenvía el log al servidor de desarrollo Vite para mostrarlo en la Debug Console de Cursor.
 */
export const relayApiDebugLog = (payload: ApiDebugLogPayload): void => {
  if (!import.meta.env.DEV) return;

  fetch(DEBUG_LOG_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Ignorar fallos del relay para no afectar la app
  });
};
