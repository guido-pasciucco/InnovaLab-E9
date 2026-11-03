import { apiRequest } from './http';
import type { Alert, Device, DeviceEvent, LotbaResponse } from './types';

/**
 * Llamadas HTTP al backend Express (rama `backend` de InnovaLab-E9).
 *
 * Sección 1: endpoints que YA existen en Backend (probados por ellos en sandbox).
 * Sección 2: endpoints PROPUESTOS por Frontend (todavía no existen). Están
 *            escritos según el contrato que pedimos en GUIA_SEMANA_8.md; se
 *            activan con los flags de ENDPOINTS_READY en src/config/env.ts.
 */

// ===================== 1. Endpoints existentes =====================

export const createResponsibleProfile = (body: { nombre: string; fechaNacimiento: string }) =>
  apiRequest<{ perfilCreado: boolean; yaExistia: boolean; responsableId: string }>(
    'POST', '/api/responsible-profile', { body, auth: true });

export const createLinkCode = () =>
  apiRequest<{ codigo: string; expiraEn: string }>('POST', '/api/link-codes', { auth: true });

export const redeemLinkCode = (body: {
  codigo: string; nombreDispositivo: string; plataforma: string; versionApp: string;
}) =>
  apiRequest<{ vinculacion: string; dispositivoId: string; responsableId: string }>(
    'POST', '/api/link-codes/redeem', { body, auth: true });

export const createProtectedProfile = (deviceId: string, body: {
  nombre: string; apellido: string; fechaNacimiento: string; parentesco: string;
}) =>
  apiRequest<{ perfilCreado: boolean; yaExistia: boolean; dispositivoId: string }>(
    'POST', `/api/devices/${encodeURIComponent(deviceId)}/protected-profile`, { body, auth: true });

/** Pública (sin token). Si `hash` coincide con la versión vigente, no vuelven los dominios. */
export const getLotbaBlocklist = (hash?: string | null) => {
  // Backend rechaza (400) cualquier hash que no sea SHA-256 hex: solo se manda si lo es.
  const valid = hash && /^[a-f0-9]{64}$/i.test(hash);
  return apiRequest<LotbaResponse>('GET', `/api/blocklists/lotba/current${valid ? `?hash=${hash}` : ''}`);
};

// ===================== 2. Endpoints propuestos (pendientes) =====================

export const listMyDevices = () =>
  apiRequest<{ dispositivos: Device[] }>('GET', '/api/devices', { auth: true }).then((r) => r.dispositivos);

export const getDeviceEvents = (deviceId: string, limit = 50) =>
  apiRequest<{ eventos: DeviceEvent[] }>(
    'GET', `/api/devices/${encodeURIComponent(deviceId)}/events?limit=${limit}`, { auth: true })
    .then((r) => r.eventos);

export const listAlerts = () =>
  apiRequest<{ alertas: Alert[] }>('GET', '/api/alerts', { auth: true }).then((r) => r.alertas);

export const markAlertRead = (alertaId: string) =>
  apiRequest<void>('POST', `/api/alerts/${encodeURIComponent(alertaId)}/read`, { auth: true });

export const getCustomList = () =>
  apiRequest<{ dominios: string[] }>('GET', '/api/custom-list', { auth: true }).then((r) => r.dominios);

export const addCustomDomain = (dominio: string) =>
  apiRequest<void>('POST', '/api/custom-list', { body: { dominio }, auth: true });

export const removeCustomDomain = (dominio: string) =>
  apiRequest<void>('DELETE', `/api/custom-list/${encodeURIComponent(dominio)}`, { auth: true });

/** Desde el dispositivo protegido (token anónimo): unión de las listas de sus responsables. */
export const getDeviceCustomList = (deviceId: string) =>
  apiRequest<{ dominios: string[] }>(
    'GET', `/api/devices/${encodeURIComponent(deviceId)}/custom-list`, { auth: true })
    .then((r) => r.dominios);

export const unlinkDevice = (deviceId: string) =>
  apiRequest<void>('DELETE', `/api/devices/${encodeURIComponent(deviceId)}`, { auth: true });

export const setPin = (pin: string) =>
  apiRequest<void>('PUT', '/api/responsible-profile/pin', { body: { pin }, auth: true });

/** Responsable verificando su propio PIN. */
export const verifyOwnPin = (pin: string) =>
  apiRequest<{ valido: boolean }>('POST', '/api/responsible-profile/pin/verify', { body: { pin }, auth: true })
    .then((r) => r.valido);

/** Dispositivo protegido verificando el PIN de alguno de sus responsables (con límite de intentos en Backend). */
export const verifyPinFromDevice = (deviceId: string, pin: string) =>
  apiRequest<{ valido: boolean }>(
    'POST', `/api/devices/${encodeURIComponent(deviceId)}/verify-pin`, { body: { pin }, auth: true })
    .then((r) => r.valido);
