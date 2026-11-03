import { ENV } from '../config/env';
import { ApiError } from './errors';
import { getValidIdToken } from './session';

const TIMEOUT_MS = 15000;

interface RequestOptions {
  body?: unknown;
  /** Si es true, agrega "Authorization: Bearer <idToken>" (todas las rutas menos la lista LOTBA). */
  auth?: boolean;
}

/**
 * Cliente HTTP del backend Express. Traduce los errores al formato
 * { error: "codigo", message } que usa la rama backend.
 */
export async function apiRequest<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.auth) headers.Authorization = `Bearer ${await getValidIdToken()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${ENV.API_BASE_URL}${path}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (e: any) {
    throw new ApiError(0, e?.name === 'AbortError' ? 'timeout' : 'network_error', 'Sin conexión con el servidor');
  } finally {
    clearTimeout(timer);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    // Algunas rutas devuelven { error: "codigo_snake", message }, el middleware de auth
    // devuelve { error: "Texto en castellano" }. Normalizamos ambos casos.
    const rawError = data?.error;
    const isCode = typeof rawError === 'string' && /^[a-z0-9_]+$/.test(rawError);
    const code = isCode ? rawError : response.status === 401 ? 'unauthorized' : `http_${response.status}`;
    const message = data?.message ?? (typeof rawError === 'string' ? rawError : `HTTP ${response.status}`);
    throw new ApiError(response.status, code, message);
  }
  return data as T;
}
