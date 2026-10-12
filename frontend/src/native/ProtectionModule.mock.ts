import { ProtectionModuleInterface, ProtectionStatus } from './ProtectionModule';

/**
 * Mock de ProtectionModule.
 * Permite desarrollar y demostrar las pantallas antes de que el módulo
 * nativo Kotlin esté implementado (ver experimentos E1-E8, Semana 1).
 *
 * Reemplazar por el Native Module real en:
 *   import { NativeModules } from 'react-native';
 *   export const ProtectionModule = NativeModules.ProtectionModule;
 */

let mockStatus: ProtectionStatus = 'unconfigured';

export const ProtectionModule: ProtectionModuleInterface = {
  async requestVpnPermission() {
    return true;
  },

  async startProtection() {
    mockStatus = 'active';
  },

  async stopProtection() {
    mockStatus = 'inactive';
  },

  async getProtectionStatus() {
    return mockStatus;
  },

  async isDeviceAdminActive() {
    return true;
  },

  async requestDeviceAdmin() {
    return true;
  },

  async isAccessibilityServiceEnabled() {
    return true;
  },

  openAccessibilitySettings() {
    console.log('[mock] Abriendo Ajustes > Accesibilidad');
  },

  async addCustomBlockedDomain(domain: string) {
    console.log(`[mock] Dominio agregado: ${domain}`);
  },

  async removeCustomBlockedDomain(domain: string) {
    console.log(`[mock] Dominio eliminado: ${domain}`);
  },
};
