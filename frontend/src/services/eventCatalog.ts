import type { DeviceEvent, EstadoDispositivo, TipoEvento } from '../api/types';
import type { ProtectionStatus } from '../native/ProtectionModule';

export type Severity = 'info' | 'warning' | 'critical';

const PERMISO_LABEL = { vpn: 'el filtro (VPN)', accesibilidad: 'la Accesibilidad', device_admin: 'el administrador del dispositivo' };
const CONFIG_LABEL = {
  desactivar_proteccion: 'desactivar la protección',
  desvincular_dispositivo: 'desvincular el dispositivo',
  cambiar_pin: 'cambiar el PIN',
  editar_lista_personalizada: 'editar los sitios personalizados',
};
const BYPASS_LABEL = {
  dns_privado: 'Se activó el "DNS privado", que puede saltear el filtro',
  vpn_externa: 'Se activó otra VPN',
  accesibilidad_desactivada: 'Se desactivó la Accesibilidad de BA Protege+',
  device_admin_desactivado: 'Se quitó el administrador del dispositivo',
  proceso_terminado: 'El sistema cerró la protección y se reinició sola',
};

/** Texto humano de un evento, para historial y alertas (sin jerga técnica). */
export function describeEvent(e: DeviceEvent): { title: string; severity: Severity } {
  switch (e.tipoEvento) {
    case 'acceso_bloqueado':
      return { title: `Se bloqueó ${e.dominio ?? 'un sitio'}${e.origenLista === 'personalizada' ? ' (sitio personalizado)' : ''}`, severity: 'info' };
    case 'proteccion_activada':
      return { title: 'Protección activada', severity: 'info' };
    case 'proteccion_desactivada':
      return { title: 'Protección desactivada', severity: e.resultado === 'exitoso' ? 'warning' : 'critical' };
    case 'cambio_permiso':
      return { title: `Se quitó el permiso de ${e.permiso ? PERMISO_LABEL[e.permiso] : 'un permiso'}`, severity: 'critical' };
    case 'intento_modificacion_config': {
      const what = e.configuracion ? CONFIG_LABEL[e.configuracion] : 'cambiar la configuración';
      return e.resultado === 'exitoso'
        ? { title: `Se autorizó con PIN: ${what}`, severity: 'info' }
        : { title: `Intento de ${what} sin autorización`, severity: 'warning' };
    }
    case 'intento_bypass':
      return { title: e.tipoBypass ? BYPASS_LABEL[e.tipoBypass] : 'Intento de evadir la protección', severity: 'critical' };
    case 'intento_instalacion':
      return { title: `Se instaló una app que puede evadir el filtro${e.paquete ? ` (${e.paquete})` : ''}`, severity: 'warning' };
    case 'sync_lista':
      return { title: `Lista de sitios actualizada${e.versionLista ? ` (v${e.versionLista.slice(0, 8)})` : ''}`, severity: 'info' };
    case 'vinculacion':
      return { title: 'Dispositivo vinculado', severity: 'info' };
    case 'desvinculacion':
      return { title: 'Dispositivo desvinculado', severity: 'warning' };
    case 'dispositivo_sin_reporte':
      return { title: 'El dispositivo dejó de reportar', severity: 'critical' };
    default:
      return { title: labelForType(e.tipoEvento), severity: 'info' };
  }
}

function labelForType(t: TipoEvento): string {
  return t.replace(/_/g, ' ');
}

/** "Hoy 18:42", "Ayer 21:10", "3/11 09:00" */
export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return 'Nunca';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, now)) return `Hoy ${hhmm}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return `Ayer ${hhmm}`;
  return `${d.getDate()}/${d.getMonth() + 1} ${hhmm}`;
}

/** El badge de UX usa los estados del módulo; Backend usa los de Firestore. */
export function estadoToStatus(estado: EstadoDispositivo): ProtectionStatus {
  return ({ activo: 'active', advertencia: 'warning', caido: 'inactive', sin_configurar: 'unconfigured' } as const)[estado];
}
