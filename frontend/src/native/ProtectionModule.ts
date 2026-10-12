/**
 * ProtectionModule
 * ------------------
 * Interfaz del puente entre React Native y el código nativo Android (Kotlin)
 * que implementa la protección real: VPN local, Device Admin y Servicio de
 * Accesibilidad.
 *
 * La implementación nativa (NO incluida en este esqueleto) debe exponerse
 * como un Native Module registrado bajo el nombre "ProtectionModule".
 * Mientras no exista, usar ProtectionModule.mock.ts para desarrollar las
 * pantallas sin bloquear el trabajo de UI.
 */

export type ProtectionStatus = 'active' | 'warning' | 'inactive' | 'unconfigured';

export interface ProtectionModuleInterface {
  /** Dispara el diálogo nativo de confirmación de VPN. */
  requestVpnPermission(): Promise<boolean>;

  /** Activa el servicio de protección (VpnService). */
  startProtection(): Promise<void>;

  /** Detiene el servicio de protección. */
  stopProtection(): Promise<void>;

  /** Estado actual, para pintar el badge de protección. */
  getProtectionStatus(): Promise<ProtectionStatus>;

  /** Consulta si el Device Admin está activo. */
  isDeviceAdminActive(): Promise<boolean>;

  /** Dispara el diálogo nativo para activar Device Admin. */
  requestDeviceAdmin(): Promise<boolean>;

  /** Consulta si el Servicio de Accesibilidad está habilitado. */
  isAccessibilityServiceEnabled(): Promise<boolean>;

  /** Abre la pantalla de Ajustes > Accesibilidad (no se puede activar por código). */
  openAccessibilitySettings(): void;

  /** Agrega un dominio a la lista personalizada del responsable. */
  addCustomBlockedDomain(domain: string): Promise<void>;

  /** Quita un dominio de la lista personalizada. */
  removeCustomBlockedDomain(domain: string): Promise<void>;
}
