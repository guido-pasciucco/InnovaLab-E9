import AsyncStorage from '@react-native-async-storage/async-storage';
import * as backend from '../api/backend';
import type { Alert, Device, DeviceEvent, TipoEvento } from '../api/types';
import { describeEvent } from './eventCatalog';

/**
 * Alertas armadas en la app a partir de los EVENTOS REALES (semana 10).
 *
 * Backend ya recibe y guarda los eventos, pero todavía no genera alertas
 * (punto 9 de su README: reglas pendientes). Para que el flujo funcione de
 * punta a punta en el build candidato, la app del Tutor lee la actividad de
 * cada dispositivo y muestra como alerta los eventos de seguridad, con las
 * mismas reglas que propusimos a Backend. El "leída" se guarda en este
 * celular. Cuando Backend publique GET /api/alerts, se activa el flag
 * `alerts` en env.ts y este archivo deja de usarse.
 */
const READ_KEY = '@baprotege/alertsRead';
const EVENTS_PER_DEVICE = 50;

function isAlertWorthy(e: DeviceEvent): boolean {
  const always: TipoEvento[] = ['proteccion_desactivada', 'cambio_permiso', 'intento_bypass', 'intento_instalacion'];
  if (always.includes(e.tipoEvento)) return true;
  return e.tipoEvento === 'intento_modificacion_config' && e.resultado === 'fallido';
}

async function readSet(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(READ_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

async function saveSet(set: Set<string>) {
  try {
    // Se guardan solo los últimos 500 ids para que no crezca sin límite.
    await AsyncStorage.setItem(READ_KEY, JSON.stringify([...set].slice(-500)));
  } catch {}
}

const deviceLabel = (d: Device) => (d.perfil ? d.perfil.nombre : d.nombre);

export async function listDerivedAlerts(): Promise<Alert[]> {
  const [devices, read] = await Promise.all([backend.listMyDevices(), readSet()]);
  const perDevice = await Promise.all(
    devices.map(async (d) => {
      const events = await backend.getDeviceEvents(d.id, EVENTS_PER_DEVICE).catch(() => [] as DeviceEvent[]);
      return events.filter(isAlertWorthy).map<Alert>((e) => ({
        alertaId: e.eventoId,
        eventoOrigenId: e.eventoId,
        dispositivoId: d.id,
        tipoEvento: e.tipoEvento,
        mensaje: `${describeEvent(e).title} (celular de ${deviceLabel(d)}).`,
        fecha: e.timestampServidor ?? e.timestampDispositivo,
        leida: read.has(e.eventoId),
      }));
    })
  );
  return perDevice.flat().sort((a, b) => b.fecha.localeCompare(a.fecha));
}

export async function markDerivedAlertRead(alertaId: string): Promise<void> {
  const set = await readSet();
  set.add(alertaId);
  await saveSet(set);
}
