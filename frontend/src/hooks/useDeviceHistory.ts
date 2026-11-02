import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { ProtectionModule, DEVICE_EVENT_RECORDED } from '../native';
import type { DeviceEvent } from '../api/types';

/** Historial de actividad guardado en ESTE celular (dispositivo protegido). Semana 6. */
export function useDeviceHistory(limit = 100) {
  const [events, setEvents] = useState<DeviceEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setEvents(await ProtectionModule.getEventHistory(limit));
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    reload();
    const sub = DeviceEventEmitter.addListener(DEVICE_EVENT_RECORDED, reload);
    return () => sub.remove();
  }, [reload]);

  return { events, loading, reload };
}
