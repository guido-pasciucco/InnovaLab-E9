import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Alert, Device, DeviceEvent, LotbaResponse } from './types';
import { DEFAULT_BLOCKLIST, DEFAULT_BLOCKLIST_VERSION } from '../data/defaultBlocklist';

/**
 * Backend simulado, en memoria. Se usa:
 *  - para TODO cuando no hay FIREBASE_WEB_API_KEY (modo demo), o
 *  - para los endpoints que Backend todavía no publicó (ENDPOINTS_READY = false).
 * Los datos imitan el modelo real (nombres de campos de Firestore).
 */

const delay = (ms = 350) => new Promise<void>((r) => setTimeout(() => r(), ms));
/** PIN del modo demo: el que se creó en "Creá tu PIN" o, si nunca se creó (ej. el celular protegido), 1234. */
const DEFAULT_MOCK_PIN = '1234';
const MOCK_PIN_KEY = '@baprotege/mockPin';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
let seq = 100;
const ev = (p: Partial<DeviceEvent> & Pick<DeviceEvent, 'tipoEvento' | 'resultado'>, mins: number): DeviceEvent => ({
  eventoId: `mock-${++seq}`,
  timestampDispositivo: minutesAgo(mins),
  secuencia: seq,
  versionApp: '0.8.0',
  ...p,
});

const devices: Device[] = [
  {
    id: 'mock-device-1',
    nombre: 'Celular de Mateo',
    estado: 'activo',
    plataforma: 'android',
    versionApp: '0.8.0',
    ultimoReporte: minutesAgo(4),
    fechaVinculacion: minutesAgo(60 * 24 * 9),
    perfil: { nombre: 'Mateo', apellido: 'Ruiz', parentesco: 'hijo' },
  },
];

const eventsByDevice: Record<string, DeviceEvent[]> = {
  'mock-device-1': [
    ev({ tipoEvento: 'acceso_bloqueado', resultado: 'bloqueado', dominio: 'betmaster.com', origenLista: 'lotba', versionLista: DEFAULT_BLOCKLIST_VERSION }, 22),
    ev({ tipoEvento: 'intento_modificacion_config', resultado: 'fallido', configuracion: 'desactivar_proteccion' }, 80),
    ev({ tipoEvento: 'acceso_bloqueado', resultado: 'bloqueado', dominio: 'apuestassonic.com', origenLista: 'lotba', versionLista: DEFAULT_BLOCKLIST_VERSION }, 60 * 20),
    ev({ tipoEvento: 'intento_bypass', resultado: 'detectado', tipoBypass: 'dns_privado' }, 60 * 26),
    ev({ tipoEvento: 'sync_lista', resultado: 'exitoso', versionLista: DEFAULT_BLOCKLIST_VERSION }, 60 * 30),
    ev({ tipoEvento: 'proteccion_activada', resultado: 'exitoso' }, 60 * 24 * 9),
  ],
};

const alerts: Alert[] = [
  {
    alertaId: 'mock-alert-1', eventoOrigenId: 'mock-104', dispositivoId: 'mock-device-1', tipoEvento: 'intento_bypass',
    mensaje: 'En el celular de Mateo se activó el "DNS privado", que puede saltear el filtro.', fecha: minutesAgo(60 * 26), leida: false,
  },
  {
    alertaId: 'mock-alert-2', eventoOrigenId: 'mock-102', dispositivoId: 'mock-device-1', tipoEvento: 'intento_modificacion_config',
    mensaje: 'Alguien intentó desactivar la protección del celular de Mateo sin el PIN.', fecha: minutesAgo(80), leida: false,
  },
];

const customList = new Set<string>(['casino-ejemplo.com']);

export const mockBackend = {
  async createResponsibleProfile() {
    await delay();
    return { perfilCreado: true, yaExistia: false, responsableId: 'mock-responsable' };
  },

  async createLinkCode() {
    await delay();
    const codigo = Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
    // Para que la demo funcione en un solo celular: a los 8 s "aparece" el dispositivo vinculado.
    setTimeout(() => {
      if (!devices.some((d) => d.id === `mock-device-${codigo}`)) {
        devices.push({
          id: `mock-device-${codigo}`, nombre: 'Nuevo dispositivo', estado: 'sin_configurar', plataforma: 'android',
          versionApp: '0.8.0', ultimoReporte: null, fechaVinculacion: new Date().toISOString(), perfil: null,
        });
      }
    }, 8000);
    return { codigo, expiraEn: new Date(Date.now() + 15 * 60000).toISOString() };
  },

  async redeemLinkCode(body: { codigo: string }) {
    await delay();
    return { vinculacion: 'completada', dispositivoId: `mock-device-${body.codigo}`, responsableId: 'mock-responsable' };
  },

  async createProtectedProfile(deviceId: string, body: { nombre: string; apellido: string; parentesco: string }) {
    await delay();
    const d = devices.find((x) => x.id === deviceId);
    if (d) {
      d.perfil = { nombre: body.nombre, apellido: body.apellido, parentesco: body.parentesco };
      d.nombre = `Celular de ${body.nombre}`;
    }
    return { perfilCreado: true, yaExistia: false, dispositivoId: deviceId };
  },

  async getLotbaBlocklist(hash?: string | null): Promise<LotbaResponse> {
    await delay();
    const version = {
      id: DEFAULT_BLOCKLIST_VERSION, fecha: null, hash: 'mock-hash', cantidadDominios: DEFAULT_BLOCKLIST.length,
      reglaCoincidencia: 'dominio_y_subdominios',
    };
    return hash === version.hash ? { actualizada: false, version } : { actualizada: true, version, dominios: DEFAULT_BLOCKLIST };
  },

  async listMyDevices() {
    await delay();
    return devices.map((d) => ({ ...d }));
  },

  async getDeviceEvents(deviceId: string) {
    await delay();
    return [...(eventsByDevice[deviceId] ?? [])];
  },

  async listAlerts() {
    await delay();
    return alerts.map((a) => ({ ...a }));
  },

  async markAlertRead(alertaId: string) {
    await delay(150);
    const a = alerts.find((x) => x.alertaId === alertaId);
    if (a) a.leida = true;
  },

  async getCustomList() {
    await delay();
    return [...customList].sort();
  },
  async addCustomDomain(dominio: string) {
    await delay();
    customList.add(dominio);
  },
  async removeCustomDomain(dominio: string) {
    await delay();
    customList.delete(dominio);
  },
  async getDeviceCustomList() {
    await delay();
    return [...customList];
  },

  async unlinkDevice(deviceId: string) {
    await delay();
    const i = devices.findIndex((d) => d.id === deviceId);
    if (i >= 0) devices.splice(i, 1);
  },

  // Bug corregido en semana 9: antes el PIN creado se ignoraba y siempre valía 1234.
  async setPin(pin: string) {
    await delay();
    try {
      await AsyncStorage.setItem(MOCK_PIN_KEY, pin);
    } catch {}
  },
  async verifyPin(pin: string) {
    await delay(400);
    let saved: string | null = null;
    try {
      saved = await AsyncStorage.getItem(MOCK_PIN_KEY);
    } catch {}
    return pin === (saved ?? DEFAULT_MOCK_PIN);
  },
};
