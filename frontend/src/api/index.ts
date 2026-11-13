import { Platform } from 'react-native';
import { ENDPOINTS_READY, ENV, USE_MOCK_BACKEND } from '../config/env';
import * as real from './backend';
import { mockBackend as mock } from './mockBackend';
import * as firebaseAuth from './firebaseAuth';
import { clearSession, getSession, saveSession } from './session';
import type { Session } from './firebaseAuth';
import { listDerivedAlerts, markDerivedAlertRead } from '../services/derivedAlerts';

export { ApiError, friendlyMessage } from './errors';
export * from './types';

/** true = esta parte usa el backend real. */
const ready = (flag: keyof typeof ENDPOINTS_READY) => !USE_MOCK_BACKEND && ENDPOINTS_READY[flag];
const REAL = !USE_MOCK_BACKEND;

function mockSession(provider: Session['provider'], uid: string, email?: string): Session {
  return { uid, provider, email, idToken: 'mock', refreshToken: 'mock', expiresAt: Date.now() + 3600e3 };
}

/**
 * Fachada única que usan las pantallas. Cada método decide si va al backend
 * real o al simulado, así las pantallas no se enteran.
 */
export const api = {
  isDemoMode: USE_MOCK_BACKEND,

  // ---------- Sesión ----------

  async registerResponsible(input: { email: string; password: string; nombre: string; fechaNacimiento: string }) {
    if (!REAL) {
      await saveSession(mockSession('password', 'mock-responsable', input.email));
      return mock.createResponsibleProfile();
    }
    const session = await firebaseAuth.signUpWithEmail(input.email, input.password);
    await saveSession(session);
    // Si esto falla, la cuenta Auth ya existe: la sesión queda guardada y se puede reintentar
    // con completeResponsibleProfile() (lo pide Backend en su README).
    return real.createResponsibleProfile({ nombre: input.nombre, fechaNacimiento: input.fechaNacimiento });
  },

  completeResponsibleProfile: (body: { nombre: string; fechaNacimiento: string }) =>
    REAL ? real.createResponsibleProfile(body) : mock.createResponsibleProfile(),

  async loginResponsible(email: string, password: string) {
    const session = REAL ? await firebaseAuth.signInWithEmail(email, password) : mockSession('password', 'mock-responsable', email);
    await saveSession(session);
    return session;
  },

  logout: clearSession,
  getSession,

  // ---------- Vinculación ----------

  createLinkCode: () => (REAL ? real.createLinkCode() : mock.createLinkCode()),

  /**
   * Del lado del dispositivo protegido: abre (o reutiliza) la sesión anónima y canjea el código.
   * Devuelve el deviceId (= UID anónimo).
   */
  async linkThisDevice(codigo: string, nombreDispositivo: string) {
    const body = {
      codigo: codigo.replace(/[\s-]/g, '').toUpperCase(),
      nombreDispositivo,
      plataforma: Platform.OS,
      versionApp: ENV.APP_VERSION,
    };
    if (!REAL) {
      const r = await mock.redeemLinkCode(body);
      await saveSession(mockSession('anonymous', r.dispositivoId));
      return r;
    }
    const existing = await getSession();
    // Reusar la sesión anónima existente mantiene el mismo UID si se reintenta.
    if (!existing || existing.provider !== 'anonymous') {
      await saveSession(await firebaseAuth.signInAnonymously());
    }
    return real.redeemLinkCode(body);
  },

  createProtectedProfile: (deviceId: string, body: { nombre: string; apellido: string; fechaNacimiento: string; parentesco: string }) =>
    REAL ? real.createProtectedProfile(deviceId, body) : mock.createProtectedProfile(deviceId, body),

  // ---------- Lista LOTBA ----------

  getLotbaBlocklist: (hash?: string | null) => (REAL ? real.getLotbaBlocklist(hash) : mock.getLotbaBlocklist(hash)),

  // ---------- Responsable: dispositivos, actividad, alertas ----------

  /** true si la lista de dispositivos viene del backend real (ver ENDPOINTS_READY). */
  devicesAreReal: ready('listDevices'),
  listMyDevices: () => (ready('listDevices') ? real.listMyDevices() : mock.listMyDevices()),
  getDeviceEvents: (deviceId: string) => (ready('deviceEvents') ? real.getDeviceEvents(deviceId) : mock.getDeviceEvents(deviceId)),
  // Alertas: endpoint real si existe; si no, derivadas de los eventos reales; en modo demo, simuladas.
  listAlerts: () =>
    ready('alerts') ? real.listAlerts() : ready('deviceEvents') ? listDerivedAlerts() : mock.listAlerts(),
  markAlertRead: (id: string) =>
    ready('alerts') ? real.markAlertRead(id) : ready('deviceEvents') ? markDerivedAlertRead(id) : mock.markAlertRead(id),
  unlinkDevice: (id: string) => (ready('unlink') ? real.unlinkDevice(id) : mock.unlinkDevice(id)),

  // ---------- Sitios personalizados ----------

  getCustomList: () => (ready('customList') ? real.getCustomList() : mock.getCustomList()),
  addCustomDomain: (d: string) => (ready('customList') ? real.addCustomDomain(d) : mock.addCustomDomain(d)),
  removeCustomDomain: (d: string) => (ready('customList') ? real.removeCustomDomain(d) : mock.removeCustomDomain(d)),
  getDeviceCustomList: (deviceId: string) =>
    ready('customList') ? real.getDeviceCustomList(deviceId) : mock.getDeviceCustomList(),

  // ---------- PIN ----------

  setPin: (pin: string) => (ready('pin') ? real.setPin(pin) : mock.setPin(pin)),

  /** Verifica el PIN contra Backend. En el dispositivo protegido usa su propia ruta (con límite de intentos). */
  async verifyPin(pin: string): Promise<boolean> {
    if (!ready('pin')) return mock.verifyPin(pin);
    const session = await getSession();
    return session?.provider === 'anonymous' ? real.verifyPinFromDevice(session.uid, pin) : real.verifyOwnPin(pin);
  },
};
