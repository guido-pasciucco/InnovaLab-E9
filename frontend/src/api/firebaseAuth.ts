import { ENV } from '../config/env';
import { ApiError } from './errors';

/**
 * Firebase Authentication por REST (sin SDK nativo).
 *
 * Por qué REST y no @react-native-firebase: es lo mismo que usa el cliente de
 * prueba de Backend (scripts/auth-smoke-test.js), no requiere google-services.json
 * ni cambios en Gradle, y alcanza para lo que necesitamos: email/contraseña para el
 * responsable y sesión anónima para el dispositivo protegido.
 */

export type AuthProvider = 'password' | 'anonymous';

export interface Session {
  uid: string;
  provider: AuthProvider;
  email?: string;
  idToken: string;
  refreshToken: string;
  /** epoch ms en que vence el idToken (dura 1 hora). */
  expiresAt: number;
}

const IDENTITY_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';
const TOKEN_URL = 'https://securetoken.googleapis.com/v1/token';

async function postJson(url: string, body: unknown, form = false): Promise<any> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json' },
      body: form ? (body as string) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network_error', 'Sin conexión');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Firebase devuelve { error: { message: "EMAIL_EXISTS" } } o "WEAK_PASSWORD : ..."
    const raw: string = data?.error?.message ?? 'UNKNOWN';
    const code = raw.split(' ')[0];
    throw new ApiError(response.status, `auth/${code}`, raw);
  }
  return data;
}

function toSession(data: any, provider: AuthProvider): Session {
  return {
    uid: data.localId ?? data.user_id,
    provider,
    email: data.email || undefined,
    idToken: data.idToken ?? data.id_token,
    refreshToken: data.refreshToken ?? data.refresh_token,
    expiresAt: Date.now() + Number(data.expiresIn ?? data.expires_in ?? 3600) * 1000,
  };
}

const key = () => ENV.FIREBASE_WEB_API_KEY;

export async function signUpWithEmail(email: string, password: string): Promise<Session> {
  const data = await postJson(`${IDENTITY_URL}:signUp?key=${key()}`, {
    email, password, returnSecureToken: true,
  });
  return toSession(data, 'password');
}

export async function signInWithEmail(email: string, password: string): Promise<Session> {
  const data = await postJson(`${IDENTITY_URL}:signInWithPassword?key=${key()}`, {
    email, password, returnSecureToken: true,
  });
  return toSession(data, 'password');
}

/** Sesión anónima del dispositivo protegido. Su UID pasa a ser el ID del dispositivo en Backend. */
export async function signInAnonymously(): Promise<Session> {
  const data = await postJson(`${IDENTITY_URL}:signUp?key=${key()}`, { returnSecureToken: true });
  return toSession(data, 'anonymous');
}

/** Renueva el idToken con el refreshToken. Mantiene el mismo UID (clave para el dispositivo). */
export async function refreshSession(session: Session): Promise<Session> {
  const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(session.refreshToken)}`;
  const data = await postJson(`${TOKEN_URL}?key=${key()}`, body, true);
  return { ...toSession(data, session.provider), email: session.email };
}
