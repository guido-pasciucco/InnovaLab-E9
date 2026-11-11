/**
 * ProtectionModule
 * ------------------
 * Contrato entre React Native y el código nativo Android (Kotlin, carpeta
 * `android-native/`), registrado como "ProtectionModule".
 *
 * `src/native/index.ts` elige entre el módulo real y ProtectionModule.mock.ts,
 * así la app sigue corriendo aunque el Kotlin no esté instalado.
 */
import type { DeviceEvent, LocalEventInput } from '../api/types';

export type ProtectionStatus = 'active' | 'warning' | 'inactive' | 'unconfigured';

/** DeviceEventEmitter: cambió el estado de protección. Payload: { status }. */
export const PROTECTION_STATUS_EVENT = 'ProtectionStatusChanged';
/** DeviceEventEmitter: se bloqueó un dominio. Payload: BlockedDomainEvent. */
export const DOMAIN_BLOCKED_EVENT = 'ProtectionDomainBlocked';
/** DeviceEventEmitter: se registró un evento nuevo (cualquier tipo). Payload: DeviceEvent. */
export const DEVICE_EVENT_RECORDED = 'ProtectionEventRecorded';

export interface BlockedDomainEvent {
  domain: string;
  /** epoch ms */
  timestamp: number;
}

export interface ProtectionDetails {
  status: ProtectionStatus;
  /** El adulto dejó la protección encendida (persistido en disco). */
  enabledByUser: boolean;
  /** El servicio VPN está corriendo ahora. */
  vpnRunning: boolean;
  deviceAdminActive: boolean;
  accessibilityEnabled: boolean;
  /** Versión de la lista LOTBA cargada (null si nunca se sincronizó). */
  blocklistVersion: string | null;
  /** Huella (hash) que devolvió Backend para esa versión: se reenvía en ?hash= para no bajarla de nuevo. */
  blocklistHash: string | null;
  blocklistCount: number;
  customDomainsCount: number;
  /** Eventos guardados en el celular que todavía no llegaron a Backend. */
  pendingEvents: number;
}

/** Chequeos anti-evasión (Semana 6). */
export interface SecurityChecks {
  /** Modo de "DNS privado" de Android. 'hostname' = estricto: puede saltear el filtro. */
  privateDnsMode: 'off' | 'opportunistic' | 'hostname' | 'unknown';
  /** true si hay riesgo concreto de que el DNS privado evite el filtro. */
  privateDnsRisk: boolean;
  /** "VPN siempre activa" configurada para BA Protege+ (null = no se puede saber todavía). */
  alwaysOnVpn: boolean | null;
  accessibilityEnabled: boolean;
  deviceAdminActive: boolean;
  notificationsEnabled: boolean;
  /** La app está excluida del ahorro de batería (clave en Xiaomi/Samsung para que no la maten). */
  batteryOptimizationIgnored: boolean;
}

/** Datos que el código nativo necesita para mandar eventos a Backend aunque la app esté cerrada. */
export interface BackendConfig {
  apiBaseUrl: string;
  firebaseApiKey: string;
  refreshToken: string;
  deviceId: string;
  appVersion: string;
  /** false mientras Backend no publique POST /api/devices/:id/events (los eventos quedan en cola). */
  uploadEnabled: boolean;
}

export interface ProtectionModuleInterface {
  // --- Permisos ---
  requestVpnPermission(): Promise<boolean>;
  isDeviceAdminActive(): Promise<boolean>;
  requestDeviceAdmin(): Promise<boolean>;
  /**
   * Quita el administrador del dispositivo (semana 9). Solo después del PIN, al
   * "Quitar la protección de este celular": si no, la app no se puede desinstalar.
   */
  removeDeviceAdmin(): Promise<void>;
  isAccessibilityServiceEnabled(): Promise<boolean>;
  /** Abre Ajustes > Accesibilidad (no se puede activar por código). */
  openAccessibilitySettings(): void;
  /** Abre Ajustes > VPN, para configurar "VPN siempre activa". */
  openVpnSettings(): void;
  /** Pide excluir la app del ahorro de batería (diálogo del sistema). */
  requestIgnoreBatteryOptimizations(): void;

  // --- Protección ---
  /** Activa y persiste la protección. Rechaza con VPN_PERMISSION_REQUIRED si falta el permiso. */
  startProtection(): Promise<void>;
  /** Detiene la protección (cambio crítico: la UI exige PIN antes). */
  stopProtection(): Promise<void>;
  getProtectionStatus(): Promise<ProtectionStatus>;
  getProtectionDetails(): Promise<ProtectionDetails>;
  getSecurityChecks(): Promise<SecurityChecks>;

  // --- Listas ---
  /** Reemplaza la lista LOTBA y la guarda en disco. Devuelve la cantidad de dominios válidos. */
  syncBlocklist(domains: string[], version: string, hash: string | null): Promise<number>;
  /** Reemplaza la lista personalizada (la que arma el responsable). */
  replaceCustomDomains(domains: string[]): Promise<number>;
  addCustomBlockedDomain(domain: string): Promise<void>;
  removeCustomBlockedDomain(domain: string): Promise<void>;

  // --- Eventos (Semanas 5-8) ---
  /** Registra un evento originado en JS (ej. PIN incorrecto). Kotlin completa id, secuencia y fecha. */
  recordEvent(event: LocalEventInput): Promise<void>;
  /** Últimos eventos del dispositivo, del más nuevo al más viejo. */
  getEventHistory(limit: number): Promise<DeviceEvent[]>;
  /** Guarda la configuración para que Kotlin suba eventos por su cuenta. */
  configureBackend(config: BackendConfig): Promise<void>;
  clearBackendConfig(): Promise<void>;
  /** Intenta subir ya los eventos pendientes. Devuelve cuántos quedan pendientes. */
  flushEvents(): Promise<number>;

  // --- Almacenamiento cifrado con Android Keystore (semana 10) ---
  secureSet(key: string, value: string): Promise<void>;
  secureGet(key: string): Promise<string | null>;
  secureRemove(key: string): Promise<void>;
}
