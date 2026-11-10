import type { Plugin } from 'vite';

const DEBUG_LOG_PATH = '/__api-debug-log';

type ApiDebugPayload = {
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

const formatPayload = (payload: ApiDebugPayload): string => {
  const lines = [
    '',
    '─'.repeat(72),
    `[API ${payload.kind.toUpperCase()}] ${payload.client}`,
    `${payload.method} ${payload.url}`,
  ];

  if (payload.status != null) {
    lines.push(`Status: ${payload.status}${payload.statusText ? ` ${payload.statusText}` : ''}`);
  }
  if (payload.message) {
    lines.push(`Message: ${payload.message}`);
  }
  if (payload.params != null) {
    lines.push('Params:', JSON.stringify(payload.params, null, 2));
  }
  if (payload.body != null) {
    lines.push('Request body:', JSON.stringify(payload.body, null, 2));
  }
  if (payload.data != null) {
    lines.push('Response data:', JSON.stringify(payload.data, null, 2));
  }
  if (payload.headers != null) {
    lines.push('Headers:', JSON.stringify(payload.headers, null, 2));
  }

  lines.push('─'.repeat(72));
  return lines.join('\n');
};

/**
 * En desarrollo, imprime en la terminal de Vite (Debug Console de Cursor)
 * las peticiones/respuestas que el navegador reenvía desde los interceptores axios.
 */
export const apiDebugLoggerPlugin = (): Plugin => ({
  name: 'api-debug-logger',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use(DEBUG_LOG_PATH, (req, res, next) => {
      if (req.method !== 'POST') {
        next();
        return;
      }

      let raw = '';
      req.on('data', (chunk) => {
        raw += chunk;
      });
      req.on('end', () => {
        try {
          const payload = JSON.parse(raw) as ApiDebugPayload;
          const output = formatPayload(payload);
          if (payload.kind === 'error') {
            console.error(output);
          } else {
            console.log(output);
          }
        } catch (error) {
          console.error('[API DEBUG] Error parseando log:', error, raw);
        }
        res.statusCode = 204;
        res.end();
      });
    });

    console.log('[Vite] API debug logger activo → peticiones visibles en Debug Console');
  },
});
