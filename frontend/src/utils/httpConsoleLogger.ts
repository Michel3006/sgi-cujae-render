import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { relayApiDebugLog, serializeBodyForDebug } from './apiDebugRelay';

const serializeHeaders = (headers: unknown): Record<string, unknown> => {
  try {
    if (headers == null) return {};
    const h = headers as {
      toJSON?: () => Record<string, unknown>;
      forEach?: (cb: (value: string, key: string) => void) => void;
    };
    if (typeof h.toJSON === 'function') {
      return h.toJSON();
    }
    if (typeof h.forEach === 'function') {
      const out: Record<string, unknown> = {};
      h.forEach((value, key) => {
        out[key] = value;
      });
      return out;
    }
    if (typeof headers === 'object' && !Array.isArray(headers)) {
      return { ...(headers as Record<string, unknown>) };
    }
    return { raw: String(headers) };
  } catch (err) {
    return { _errorSerializandoCabeceras: String(err) };
  }
};

const buildFullUrl = (config: InternalAxiosRequestConfig): string => {
  const base = config.baseURL ?? '';
  const path = config.url ?? '';
  return `${base}${path}`;
};

export const logHttpRequest = (clientLabel: string, config: InternalAxiosRequestConfig) => {
  const method = (config.method ?? 'get').toUpperCase();
  const url = buildFullUrl(config);
  const headers = serializeHeaders(config.headers);
  const params = config.params ?? null;
  const body = serializeBodyForDebug(config.data);

  console.groupCollapsed(`[API →] ${clientLabel} ${method} ${url}`);
  console.log('Headers:', headers);
  console.log('Params:', params);
  console.log('Body:', body);
  console.groupEnd();

  relayApiDebugLog({
    kind: 'request',
    client: clientLabel,
    method,
    url,
    headers,
    params,
    body,
  });
};

export const logHttpResponseOk = (clientLabel: string, response: AxiosResponse) => {
  const method = (response.config.method ?? 'get').toUpperCase();
  const url = buildFullUrl(response.config);
  const headers = serializeHeaders(response.headers);
  const data = response.data;

  console.groupCollapsed(`[API ← OK] ${clientLabel} ${response.status} ${method} ${url}`);
  console.log('Status:', response.status, response.statusText);
  console.log('Headers:', headers);
  console.log('Data:', data);
  console.groupEnd();

  relayApiDebugLog({
    kind: 'response',
    client: clientLabel,
    method,
    url,
    status: response.status,
    statusText: response.statusText,
    headers,
    data,
  });
};

export const logHttpResponseError = (clientLabel: string, error: AxiosError) => {
  const cfg = error.config;
  const method = (cfg?.method ?? '?').toUpperCase();
  const url = cfg ? buildFullUrl(cfg) : '(sin URL)';
  const requestBody = serializeBodyForDebug(cfg?.data);
  const requestHeaders = cfg ? serializeHeaders(cfg.headers) : null;
  const requestParams = cfg?.params ?? null;

  console.groupCollapsed(`[API ← ERROR] ${clientLabel} ${error.response?.status ?? '—'} ${method} ${url}`);
  if (cfg) {
    console.log('Request headers:', requestHeaders);
    console.log('Request params:', requestParams);
    console.log('Request body:', requestBody);
  }
  if (error.response) {
    console.log('Response status:', error.response.status, error.response.statusText);
    console.log('Response headers:', serializeHeaders(error.response.headers));
    console.log('Response data:', error.response.data);
  } else {
    console.log('Sin respuesta del servidor:', error.message);
  }
  console.groupEnd();

  relayApiDebugLog({
    kind: 'error',
    client: clientLabel,
    method,
    url,
    status: error.response?.status ?? null,
    statusText: error.response?.statusText ?? null,
    headers: error.response ? serializeHeaders(error.response.headers) : requestHeaders,
    params: requestParams,
    body: requestBody,
    data: error.response?.data ?? null,
    message: error.message,
  });
};
