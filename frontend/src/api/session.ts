import AsyncStorage from '@react-native-async-storage/async-storage';
import { refreshSession, Session } from './firebaseAuth';
import { ApiError } from './errors';
import { ProtectionModule, isNativeProtectionAvailable } from '../native';

/**
 * Guarda la sesión de Firebase en el celular, para no pedir login cada vez y,
 * sobre todo, para que el dispositivo protegido conserve SIEMPRE el mismo UID
 * anónimo (si se pierde, Backend lo vería como otro dispositivo).
 *
 * Semana 10 (seguridad): la sesión incluye el refresh token, que permite actuar
 * en nombre del usuario. Ahora se guarda CIFRADA con el Android Keystore
 * (ProtectionModule.secure*). Si quedó una sesión sin cifrar de una versión
 * anterior en AsyncStorage, se migra y se borra la copia vieja.
 */
const KEY = '@baprotege/session';
const SECURE_KEY = 'session';

const storage = {
  async get(): Promise<string | null> {
    if (!isNativeProtectionAvailable) return AsyncStorage.getItem(KEY);
    const secure = await ProtectionModule.secureGet(SECURE_KEY);
    if (secure) return secure;
    const legacy = await AsyncStorage.getItem(KEY);
    if (legacy) {
      await ProtectionModule.secureSet(SECURE_KEY, legacy);
      await AsyncStorage.removeItem(KEY);
    }
    return legacy;
  },
  async set(value: string): Promise<void> {
    if (isNativeProtectionAvailable) await ProtectionModule.secureSet(SECURE_KEY, value);
    else await AsyncStorage.setItem(KEY, value);
  },
  async remove(): Promise<void> {
    if (isNativeProtectionAvailable) await ProtectionModule.secureRemove(SECURE_KEY);
    await AsyncStorage.removeItem(KEY);
  },
};
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

let cached: Session | null | undefined;
/** Semana 9: una sola renovación a la vez (antes, N pedidos simultáneos renovaban N veces). */
let refreshing: Promise<string> | null = null;

export async function getSession(): Promise<Session | null> {
  if (cached !== undefined) return cached;
  try {
    const raw = await storage.get();
    cached = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    cached = null;
  }
  return cached;
}

export async function saveSession(session: Session): Promise<void> {
  cached = session;
  try {
    await storage.set(JSON.stringify(session));
  } catch (e) {
    console.warn('[session] no se pudo guardar', e);
  }
}

export async function clearSession(): Promise<void> {
  cached = null;
  try {
    await storage.remove();
  } catch {}
}

async function doRefresh(session: Session): Promise<string> {
  if (!refreshing) {
    refreshing = refreshSession(session)
      .then(async (renewed) => {
        await saveSession(renewed);
        return renewed.idToken;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

/** Devuelve un idToken vigente, renovándolo si está por vencer (o si `force`). */
export async function getValidIdToken(force = false): Promise<string> {
  const session = await getSession();
  if (!session) throw new ApiError(401, 'unauthorized', 'No hay sesión iniciada');
  if (!force && session.expiresAt - Date.now() > REFRESH_MARGIN_MS) return session.idToken;
  return doRefresh(session);
}
