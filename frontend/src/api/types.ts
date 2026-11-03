/**
 * Tipos compartidos con Backend. Los nombres de campos siguen el modelo de
 * datos aprobado (backend/README.md, rama backend) para no traducir nada.
 */

// ---------- Eventos (taxonomía acordada Backend + Data Analytics) ----------

export type TipoEvento =
  | 'vinculacion'
  | 'desvinculacion'
  | 'proteccion_activada'
  | 'proteccion_desactivada'
  | 'acceso_bloqueado'
  | 'intento_instalacion'
  | 'cambio_permiso'
  | 'intento_modificacion_config'
  | 'intento_bypass'
  | 'sync_lista'
  | 'alerta_generada'
  | 'alerta_entregada'
  | 'alerta_leida'
  | 'dispositivo_sin_reporte';

export type ResultadoEvento = 'bloqueado' | 'detectado' | 'exitoso' | 'fallido';

/** Catálogos propuestos por Backend (punto 4 de "A DEFINIR"), validados por Mobile. */
export type Permiso = 'vpn' | 'accesibilidad' | 'device_admin';
export type Configuracion =
  | 'desactivar_proteccion'
  | 'desvincular_dispositivo'
  | 'cambiar_pin'
  | 'editar_lista_personalizada';
export type TipoBypass =
  | 'dns_privado'
  | 'vpn_externa'
  | 'accesibilidad_desactivada'
  | 'device_admin_desactivado'
  | 'proceso_terminado';

export interface DeviceEvent {
  eventoId: string;
  tipoEvento: TipoEvento;
  resultado: ResultadoEvento;
  /** ISO 8601 según el reloj del dispositivo (dato informativo, no confiable). */
  timestampDispositivo: string;
  secuencia: number;
  versionApp: string;
  versionLista?: string;
  // Campos propios según tipo
  dominio?: string;
  origenLista?: 'lotba' | 'personalizada';
  cantidad?: number;
  permiso?: Permiso;
  configuracion?: Configuracion;
  tipoBypass?: TipoBypass;
  /** Paquete de la app instalada (solo intento_instalacion). Pendiente de aprobar por Data Analytics. */
  paquete?: string;
}

/** Lo que la app le pasa al módulo nativo para registrar un evento (el resto lo completa Kotlin). */
export type LocalEventInput = Pick<DeviceEvent, 'tipoEvento' | 'resultado'> &
  Partial<Pick<DeviceEvent, 'dominio' | 'origenLista' | 'permiso' | 'configuracion' | 'tipoBypass' | 'paquete'>>;

// ---------- Dispositivos ----------

export type EstadoDispositivo = 'activo' | 'advertencia' | 'caido' | 'sin_configurar';

export interface Device {
  id: string;
  nombre: string;
  estado: EstadoDispositivo;
  plataforma: string;
  versionApp: string;
  /** ISO o null si nunca reportó. */
  ultimoReporte: string | null;
  fechaVinculacion: string | null;
  perfil?: { nombre: string; apellido: string; parentesco: string } | null;
}

// ---------- Alertas ----------

export interface Alert {
  alertaId: string;
  eventoOrigenId: string;
  dispositivoId: string;
  tipoEvento: TipoEvento;
  mensaje: string;
  fecha: string;
  /** Estado de lectura para ESTE responsable (propuesta: estado por destinatario). */
  leida: boolean;
}

// ---------- Lista LOTBA (contrato real: GET /api/blocklists/lotba/current) ----------

export interface LotbaVersion {
  id: string;
  fecha: string | null;
  hash: string;
  cantidadDominios: number;
  reglaCoincidencia: string;
}

export interface LotbaResponse {
  actualizada: boolean;
  version: LotbaVersion;
  dominios?: string[];
}
