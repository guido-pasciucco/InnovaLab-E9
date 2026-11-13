import { ENV } from '../config/env';
import { ApiError } from './errors';
import { getValidIdToken } from './session';

const TIMEOUT_MS = 15000;
/** Esperas entre reintentos (semana 9): solo para lecturas y errores transitorios. */
const RETRY_DELAYS_MS = [1000, 3000];

interface RequestOptions {
  body?: unknown;
  /** Si es true, agrega "Authorization: Bearer <idToken>" (todas las rutas menos la lista LOTBA). */
  auth?: boolean;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(() => r(), ms));
const isTransient = (e: unknown) =>
  e instanceof ApiError && (e.code === 'network_error' || e.code === 'timeout' || e.status >= 500);

async function once<T>(method: string, path: string, options: RequestOptions, forceToken: boolean): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.auth) headers.Authorization = `Bearer ${await getValidIdToken(forceToken)}`;

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
    // Algunas rutas devuelven { error: "codigo_snake", message }; el middleware de auth
    // devuelve { error: "Texto en castellano" }. Normalizamos ambos casos.
    const rawError = data?.error;
    const isCode = typeof rawError === 'string' && /^[a-z0-9_]+$/.test(rawError);
    const code = isCode ? rawError : response.status === 401 ? 'unauthorized' : `http_${response.status}`;
    const message = data?.message ?? (typeof rawError === 'string' ? rawError : `HTTP ${response.status}`);
    throw new ApiError(response.status, code, message);
  }
  return data as T;
}

/**
 * Cliente HTTP del backend Express.
 * Semana 9:
 *  - 401 con sesión: renueva el token una vez y reintenta (token revocado o reloj desfasado).
 *  - GET con error transitorio (sin red, timeout, 5xx): hasta 2 reintentos con espera.
 *    Los POST/PUT/DELETE no se reintentan solos, para no duplicar acciones.
 */
export async function apiRequest<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const canRetry = method === 'GET';
  for (let attempt = 0; ; attempt++) {
    try {
      try {
        return await once<T>(method, path, options, false);
      } catch (e) {
        if (options.auth && e instanceof ApiError && e.status === 401) {
          return await once<T>(method, path, options, true);
        }
        throw e;
      }
    } catch (e) {
      if (!canRetry || !isTransient(e) || attempt >= RETRY_DELAYS_MS.length) throw e;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}
