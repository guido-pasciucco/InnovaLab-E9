import { ENDPOINTS_READY, ENV, USE_MOCK_BACKEND } from '../config/env';
import { api } from '../api';
import { ProtectionModule } from '../native';
import { syncBlocklist, syncCustomList } from './blocklistSync';

const MIN_INTERVAL_MS = 6 * 60 * 60 * 1000; // la lista LOTBA no cambia seguido: cada 6 h alcanza
let lastSync = 0;

/**
 * Le pasa al módulo nativo lo que necesita para mandar eventos a Backend por su
 * cuenta (aunque la app esté cerrada): URL, Web API key, refresh token de la
 * sesión anónima y el deviceId. Se llama al vincular y al abrir la app.
 */
export async function configureNativeUploader(): Promise<void> {
  const session = await api.getSession();
  if (USE_MOCK_BACKEND || !session || session.provider !== 'anonymous') return;
  await ProtectionModule.configureBackend({
    apiBaseUrl: ENV.API_BASE_URL,
    firebaseApiKey: ENV.FIREBASE_WEB_API_KEY,
    refreshToken: session.refreshToken,
    deviceId: session.uid,
    appVersion: ENV.APP_VERSION,
    uploadEnabled: ENDPOINTS_READY.ingestEvents,
  });
}

/**
 * Sincronización del dispositivo protegido al abrir la app / volver a primer plano:
 * lista LOTBA (con hash), lista personalizada y envío de eventos pendientes.
 * Cada paso es independiente: si uno falla, los demás siguen.
 */
export async function syncProtectedDevice(force = false): Promise<void> {
  if (!force && Date.now() - lastSync < MIN_INTERVAL_MS) {
    await ProtectionModule.flushEvents().catch(() => {});
    return;
  }
  lastSync = Date.now();
  const session = await api.getSession();

  await configureNativeUploader().catch((e) => console.warn('[deviceSync] uploader', e));
  await syncBlocklist().catch((e) => console.warn('[deviceSync] LOTBA', e));
  if (session) await syncCustomList(session.uid).catch((e) => console.warn('[deviceSync] personalizada', e));
  await ProtectionModule.flushEvents().catch(() => {});
}
