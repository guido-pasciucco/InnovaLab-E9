import { useCallback, useEffect, useState } from 'react';
import { AppState, DeviceEventEmitter, PermissionsAndroid, Platform } from 'react-native';
import { ProtectionModule, PROTECTION_STATUS_EVENT } from '../native';
import type { ProtectionDetails, SecurityChecks } from '../native';
import { ensureBlocklist } from '../services/blocklistSync';
import { syncProtectedDevice } from '../services/deviceSync';

export type ProtectionError = 'vpn_denied' | 'sync_failed' | 'unknown' | null;

/**
 * Estado de protección del dispositivo actual + acciones.
 * Se refresca cuando el módulo nativo avisa un cambio y cuando la app vuelve
 * a primer plano (por ejemplo, al volver de Ajustes).
 *
 * `deactivate` NO pide PIN por sí sola: quien la llama debe pasar antes por
 * `useCriticalAction().authorize(...)`.
 */
export function useProtection() {
  const [details, setDetails] = useState<ProtectionDetails | null>(null);
  const [checks, setChecks] = useState<SecurityChecks | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ProtectionError>(null);

  const refresh = useCallback(async () => {
    try {
      const [d, c] = await Promise.all([
        ProtectionModule.getProtectionDetails(),
        ProtectionModule.getSecurityChecks(),
      ]);
      setDetails(d);
      setChecks(c);
    } catch (e) {
      console.warn('[useProtection] refresh falló', e);
    }
  }, []);

  useEffect(() => {
    refresh();
    const statusSub = DeviceEventEmitter.addListener(PROTECTION_STATUS_EVENT, refresh);
    const appStateSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => {
      statusSub.remove();
      appStateSub.remove();
    };
  }, [refresh]);

  const activate = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      // Android 13+: sin este permiso no se ven la notificación persistente ni los avisos de bloqueo.
      if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
        await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS' as never);
      }
      const granted = await ProtectionModule.requestVpnPermission();
      if (!granted) {
        setError('vpn_denied');
        return false;
      }
      await ensureBlocklist();
      await ProtectionModule.startProtection();
      return true;
    } catch (e) {
      console.warn('[useProtection] activate falló', e);
      setError('unknown');
      return false;
    } finally {
      setBusy(false);
      await refresh();
    }
  }, [refresh]);

  const deactivate = useCallback(async (): Promise<void> => {
    setBusy(true);
    try {
      await ProtectionModule.stopProtection();
    } finally {
      setBusy(false);
      await refresh();
    }
  }, [refresh]);

  /** Fuerza sincronizar listas y subir eventos. */
  const syncNow = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await syncProtectedDevice(true);
    } catch {
      setError('sync_failed');
    } finally {
      setBusy(false);
      await refresh();
    }
  }, [refresh]);

  return { details, checks, busy, error, refresh, activate, deactivate, syncNow };
}
