import AsyncStorage from '@react-native-async-storage/async-storage';
import { refreshSession, Session } from './firebaseAuth';
import { ApiError } from './errors';

/**
 * Guarda la sesión de Firebase en el celular, para no pedir login cada vez y,
 * sobre todo, para que el dispositivo protegido conserve SIEMPRE el mismo UID
 * anónimo (si se pierde, Backend lo vería como otro dispositivo).
 */
const KEY = '@baprotege/session';
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

let cached: Session | null | undefined;

export async function getSession(): Promise<Session | null> {
  if (cached !== undefined) return cached;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cached = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    cached = null;
  }
  return cached;
}

export async function saveSession(session: Session): Promise<void> {
  cached = session;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('[session] no se pudo guardar', e);
  }
}

export async function clearSession(): Promise<void> {
  cached = null;
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}

/** Devuelve un idToken vigente, renovándolo si está por vencer. */
export async function getValidIdToken(): Promise<string> {
  const session = await getSession();
  if (!session) throw new ApiError(401, 'unauthorized', 'No hay sesión iniciada');
  if (session.expiresAt - Date.now() > REFRESH_MARGIN_MS) return session.idToken;
  const renewed = await refreshSession(session);
  await saveSession(renewed);
  return renewed.idToken;
}
