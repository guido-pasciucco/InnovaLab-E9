import { DeviceEventEmitter } from 'react-native';
import {
  DEVICE_EVENT_RECORDED,
  DOMAIN_BLOCKED_EVENT,
  PROTECTION_STATUS_EVENT,
  ProtectionDetails,
  ProtectionModuleInterface,
  ProtectionStatus,
} from './ProtectionModule';
import type { DeviceEvent, LocalEventInput } from '../api/types';
import { ENV } from '../config/env';

/**
 * Mock con la misma semántica que el Kotlin, en memoria.
 * Extra para demos: cada 45 s con la protección activa simula un bloqueo,
 * así el historial y las notificaciones tienen datos sin un navegador.
 */

let everEnabled = false;
let enabledByUser = false;
let blocklistVersion: string | null = null;
let blocklistHash: string | null = null;
let blocklist: string[] = [];
const customDomains = new Set<string>();
const history: DeviceEvent[] = [];
let seq = 0;
let demoTimer: ReturnType<typeof setInterval> | null = null;

function computeStatus(): ProtectionStatus {
  if (!everEnabled) return 'unconfigured';
  if (!enabledByUser) return 'inactive';
  return blocklist.length > 0 ? 'active' : 'warning';
}

function emitStatus() {
  DeviceEventEmitter.emit(PROTECTION_STATUS_EVENT, { status: computeStatus() });
}

function record(input: LocalEventInput) {
  const e: DeviceEvent = {
    eventoId: `local-${Date.now()}-${++seq}`,
    timestampDispositivo: new Date().toISOString(),
    secuencia: seq,
    versionApp: ENV.APP_VERSION,
    versionLista: blocklistVersion ?? undefined,
    ...input,
  };
  history.unshift(e);
  if (history.length > 300) history.pop();
  DeviceEventEmitter.emit(DEVICE_EVENT_RECORDED, e);
}

function startDemoBlocks() {
  if (demoTimer) return;
  demoTimer = setInterval(() => {
    if (!enabledByUser || blocklist.length === 0) return;
    const domain = blocklist[Math.floor(Math.random() * blocklist.length)];
    record({ tipoEvento: 'acceso_bloqueado', resultado: 'bloqueado', dominio: domain, origenLista: 'lotba' });
    DeviceEventEmitter.emit(DOMAIN_BLOCKED_EVENT, { domain, timestamp: Date.now() });
  }, 45000);
}

export const ProtectionModule: ProtectionModuleInterface = {
  async requestVpnPermission() { return true; },
  async isDeviceAdminActive() { return true; },
  async requestDeviceAdmin() { return true; },
  async isAccessibilityServiceEnabled() { return true; },
  openAccessibilitySettings() { console.log('[mock] Abriendo Ajustes > Accesibilidad'); },
  openVpnSettings() { console.log('[mock] Abriendo Ajustes > VPN'); },
  requestIgnoreBatteryOptimizations() { console.log('[mock] Pidiendo excluir del ahorro de batería'); },

  async startProtection() {
    everEnabled = true;
    if (!enabledByUser) record({ tipoEvento: 'proteccion_activada', resultado: 'exitoso' });
    enabledByUser = true;
    startDemoBlocks();
    emitStatus();
  },

  async stopProtection() {
    if (enabledByUser) record({ tipoEvento: 'proteccion_desactivada', resultado: 'exitoso' });
    enabledByUser = false;
    emitStatus();
  },

  async getProtectionStatus() { return computeStatus(); },

  async getProtectionDetails(): Promise<ProtectionDetails> {
    return {
      status: computeStatus(),
      enabledByUser,
      vpnRunning: enabledByUser,
      deviceAdminActive: true,
      accessibilityEnabled: true,
      blocklistVersion,
      blocklistHash,
      blocklistCount: blocklist.length,
      customDomainsCount: customDomains.size,
      pendingEvents: 0,
    };
  },

  async getSecurityChecks() {
    return {
      privateDnsMode: 'off' as const,
      privateDnsRisk: false,
      alwaysOnVpn: null,
      accessibilityEnabled: true,
      deviceAdminActive: true,
      notificationsEnabled: true,
      batteryOptimizationIgnored: true,
    };
  },

  async syncBlocklist(domains: string[], version: string, hash: string | null) {
    blocklist = [...domains];
    blocklistVersion = version;
    blocklistHash = hash;
    record({ tipoEvento: 'sync_lista', resultado: 'exitoso' });
    emitStatus();
    return domains.length;
  },

  async replaceCustomDomains(domains: string[]) {
    customDomains.clear();
    domains.forEach((d) => customDomains.add(d.toLowerCase()));
    return customDomains.size;
  },
  async addCustomBlockedDomain(domain: string) { customDomains.add(domain.toLowerCase()); },
  async removeCustomBlockedDomain(domain: string) { customDomains.delete(domain.toLowerCase()); },

  async recordEvent(event: LocalEventInput) { record(event); },
  async getEventHistory(limit: number) { return history.slice(0, limit); },
  async configureBackend() {},
  async clearBackendConfig() {},
  async flushEvents() { return 0; },
};
