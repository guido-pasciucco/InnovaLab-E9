import { ProtectionModule } from '../native';
import { api } from '../api';
import { DEFAULT_BLOCKLIST, DEFAULT_BLOCKLIST_VERSION } from '../data/defaultBlocklist';

export interface SyncResult {
  version: string;
  count: number;
  /** false si Backend respondió que ya teníamos la última versión. */
  updated: boolean;
  /** true si no hubo backend y se cargó la lista de ejemplo. */
  usedFallback: boolean;
}

/**
 * Sincroniza la lista oficial LOTBA con el endpoint REAL de Backend:
 *   GET /api/blocklists/lotba/current?hash=<huella local>
 * Si la huella coincide, Backend no reenvía los dominios (actualizada: false).
 * El bloqueo usa siempre la copia guardada en el celular, así funciona sin conexión.
 */
export async function syncBlocklist(): Promise<SyncResult> {
  const local = await ProtectionModule.getProtectionDetails();
  try {
    const res = await api.getLotbaBlocklist(local.blocklistHash);
    if (!res.actualizada || !res.dominios) {
      return { version: res.version.id, count: local.blocklistCount, updated: false, usedFallback: false };
    }
    const count = await ProtectionModule.syncBlocklist(res.dominios, res.version.id, res.version.hash);
    return { version: res.version.id, count, updated: true, usedFallback: false };
  } catch (e) {
    // Sin conexión o sin lista publicada: si el celular ya tiene una lista, se sigue usando.
    if (local.blocklistCount > 0) throw e;
    console.warn('[blocklistSync] sin backend, cargando lista de ejemplo', e);
    const count = await ProtectionModule.syncBlocklist(DEFAULT_BLOCKLIST, DEFAULT_BLOCKLIST_VERSION, null);
    return { version: DEFAULT_BLOCKLIST_VERSION, count, updated: true, usedFallback: true };
  }
}

/** Trae la lista personalizada de los responsables y la aplica en el filtro. */
export async function syncCustomList(deviceId: string): Promise<number> {
  const domains = await api.getDeviceCustomList(deviceId);
  return ProtectionModule.replaceCustomDomains(domains);
}

/** Sincroniza solo si el dispositivo todavía no tiene ninguna lista cargada. */
export async function ensureBlocklist(): Promise<void> {
  const details = await ProtectionModule.getProtectionDetails();
  if (details.blocklistCount === 0) {
    await syncBlocklist();
  }
}
