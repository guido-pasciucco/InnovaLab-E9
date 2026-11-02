import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persistencia (en disco) del modo elegido y del estado del onboarding de
 * permisos, para que al reabrir la app -o tras reiniciar el celular- se
 * vaya directo a la pantalla correcta.
 *
 * Semana 4: reemplaza la versión en memoria de las semanas 1-3.
 * Si AsyncStorage falla (raro), degradamos a "sin datos" en vez de crashear.
 */

export type AppMode = 'responsable' | 'protegido' | null;

const KEY_MODE = '@baprotege/mode';
const KEY_PERMISSIONS_DONE = '@baprotege/permissionsDone';

export const AppModeStorage = {
  async getMode(): Promise<AppMode> {
    try {
      const value = await AsyncStorage.getItem(KEY_MODE);
      return value === 'responsable' || value === 'protegido' ? value : null;
    } catch {
      return null;
    }
  },

  async setMode(mode: AppMode): Promise<void> {
    try {
      if (mode === null) {
        await AsyncStorage.removeItem(KEY_MODE);
      } else {
        await AsyncStorage.setItem(KEY_MODE, mode);
      }
    } catch (e) {
      console.warn('[AppModeStorage] no se pudo guardar el modo', e);
    }
  },

  async getPermissionsDone(): Promise<boolean> {
    try {
      return (await AsyncStorage.getItem(KEY_PERMISSIONS_DONE)) === '1';
    } catch {
      return false;
    }
  },

  async setPermissionsDone(done: boolean): Promise<void> {
    try {
      if (done) {
        await AsyncStorage.setItem(KEY_PERMISSIONS_DONE, '1');
      } else {
        await AsyncStorage.removeItem(KEY_PERMISSIONS_DONE);
      }
    } catch (e) {
      console.warn('[AppModeStorage] no se pudo guardar permissionsDone', e);
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEY_MODE);
      await AsyncStorage.removeItem(KEY_PERMISSIONS_DONE);
    } catch (e) {
      console.warn('[AppModeStorage] no se pudo limpiar', e);
    }
  },
};
