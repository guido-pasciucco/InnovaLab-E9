/**
 * Persistencia simple del modo de la app, para saber -al reabrirla- si hay
 * que mostrar el onboarding o ir directo al stack correspondiente.
 *
 * NOTA: usar un almacenamiento real (ej. @react-native-async-storage/async-storage
 * o MMKV) al conectar esto a un proyecto React Native inicializado. Esta
 * versión en memoria es solo para desarrollo del esqueleto.
 */

export type AppMode = 'responsable' | 'protegido' | null;

let currentMode: AppMode = null;

export const AppModeStorage = {
  async getMode(): Promise<AppMode> {
    return currentMode;
  },

  async setMode(mode: AppMode): Promise<void> {
    currentMode = mode;
  },

  async clear(): Promise<void> {
    currentMode = null;
  },
};
