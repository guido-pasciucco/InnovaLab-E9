const net = require("node:net");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../config/firebase");
const { HttpError } = require("../errors/HttpError");

const DEVICE_COLLECTION = "dispositivos";
const PROTECTED_PROFILE_COLLECTION = "perfilProtegido";
const PROTECTED_PROFILE_DOCUMENT = "datos";
const EVENT_TYPES = new Set([
  "proteccion_activada",
  "proteccion_desactivada",
  "acceso_bloqueado",
  "intento_instalacion",
  "cambio_permiso",
  "intento_modificacion_config",
  "intento_bypass",
  "sync_lista"
]);
const EVENT_RESULTS = new Set(["bloqueado", "detectado", "exitoso", "fallido"]);
const EVENT_FIELDS = new Set([
  "eventoId",
  "tipoEvento",
  "resultado",
  "timestampDispositivo",
  "secuencia",
  "versionApp",
  "versionLista",
  "dominio",
  "origenLista",
  "cantidad",
  "permiso",
  "configuracion",
  "tipoBypass",
  "paquete"
]);
const PERMISSIONS = new Set(["vpn", "accesibilidad", "device_admin"]);
const CONFIGURATIONS = new Set([
  "desactivar_proteccion",
  "desvincular_dispositivo",
  "cambiar_pin",
  "editar_lista_personalizada"
]);
const BYPASS_TYPES = new Set([
  "dns_privado",
  "vpn_externa",
  "accesibilidad_desactivada",
  "device_admin_desactivado",
  "proceso_terminado"
]);
const MAX_EVENTS_PER_REQUEST = 100;

function toIsoString(value) {
  if (!value) {
    return null;
  }

  const date = typeof value.toDate === "function" ? value.toDate() : value;
  return date instanceof Date && Number.isFinite(date.getTime())
    ? date.toISOString()
    : null;
}

function validateNonEmptyString(value, maxLength) {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength;
}

function validateDomain(value) {
  if (!validateNonEmptyString(value, 253)) {
    return false;
  }

  const domain = value.trim().toLowerCase().replace(/\.$/, "");
  if (net.isIP(domain)) {
    return false;
  }

  const labels = domain.split(".");
  return labels.length >= 2 &&
    labels.every((label) =>
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
    );
}

function validateEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new HttpError(400, "invalid_event", "El cuerpo debe ser un evento.");
  }

  if (Object.keys(event).some((field) => !EVENT_FIELDS.has(field))) {
    throw new HttpError(
      400,
      "invalid_event",
      "El evento contiene campos no permitidos."
    );
  }

  if (
    typeof event.eventoId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event.eventoId)
  ) {
    throw new HttpError(400, "invalid_event_id", "eventoId debe ser un UUID.");
  }

  if (!EVENT_TYPES.has(event.tipoEvento)) {
    throw new HttpError(400, "invalid_event_type", "El tipo de evento no está permitido.");
  }

  if (!EVENT_RESULTS.has(event.resultado)) {
    throw new HttpError(400, "invalid_event_result", "El resultado del evento no es válido.");
  }

  if (
    typeof event.timestampDispositivo !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(event.timestampDispositivo) ||
    !Number.isFinite(Date.parse(event.timestampDispositivo))
  ) {
    throw new HttpError(
      400,
      "invalid_event_timestamp",
      "timestampDispositivo debe ser una fecha ISO 8601."
    );
  }

  if (!Number.isSafeInteger(event.secuencia) || event.secuencia < 1) {
    throw new HttpError(
      400,
      "invalid_event_sequence",
      "secuencia debe ser un entero positivo."
    );
  }

  if (!validateNonEmptyString(event.versionApp, 30)) {
    throw new HttpError(400, "invalid_app_version", "versionApp es obligatoria.");
  }

  if (
    event.versionLista !== undefined &&
    !validateNonEmptyString(event.versionLista, 100)
  ) {
    throw new HttpError(400, "invalid_list_version", "versionLista no es válida.");
  }

  if (
    ["acceso_bloqueado", "sync_lista"].includes(event.tipoEvento) &&
    !validateNonEmptyString(event.versionLista, 100)
  ) {
    throw new HttpError(
      400,
      "invalid_list_version",
      "versionLista es obligatoria para este tipo de evento."
    );
  }

  if (
    event.tipoEvento === "acceso_bloqueado" &&
    (!validateDomain(event.dominio) ||
      !["lotba", "personalizada"].includes(event.origenLista))
  ) {
    throw new HttpError(
      400,
      "invalid_blocked_site_event",
      "El evento de acceso bloqueado requiere dominio y origenLista válidos."
    );
  }

  if (
    event.tipoEvento === "intento_instalacion" &&
    (!validateNonEmptyString(event.paquete, 255) ||
      !/^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+$/.test(event.paquete))
  ) {
    throw new HttpError(
      400,
      "invalid_package_name",
      "intento_instalacion requiere un nombre de paquete válido."
    );
  }

  if (
    event.tipoEvento === "cambio_permiso" &&
    !PERMISSIONS.has(event.permiso)
  ) {
    throw new HttpError(
      400,
      "invalid_permission",
      "cambio_permiso requiere un permiso reconocido."
    );
  }

  if (
    event.tipoEvento === "intento_modificacion_config" &&
    !CONFIGURATIONS.has(event.configuracion)
  ) {
    throw new HttpError(
      400,
      "invalid_configuration",
      "intento_modificacion_config requiere una configuración reconocida."
    );
  }

  if (
    event.tipoEvento === "intento_bypass" &&
    !BYPASS_TYPES.has(event.tipoBypass)
  ) {
    throw new HttpError(
      400,
      "invalid_bypass_type",
      "intento_bypass requiere un tipo reconocido."
    );
  }

  if (
    event.cantidad !== undefined &&
    (!Number.isSafeInteger(event.cantidad) || event.cantidad < 0)
  ) {
    throw new HttpError(400, "invalid_event_count", "cantidad debe ser un entero no negativo.");
  }

  return {
    ...event,
    timestampDispositivo: new Date(event.timestampDispositivo),
    ...(event.dominio
      ? { dominio: event.dominio.trim().toLowerCase().replace(/\.$/, "") }
      : {}),
    ...(event.versionApp ? { versionApp: event.versionApp.trim() } : {}),
    ...(event.versionLista ? { versionLista: event.versionLista.trim() } : {}),
    ...(event.paquete ? { paquete: event.paquete.trim() } : {})
  };
}

function eventStatusUpdate(event, device) {
  let nextStatus = null;
  if (event.tipoEvento === "proteccion_activada" && event.resultado === "exitoso") {
    nextStatus = "activo";
  } else if (
    (event.tipoEvento === "proteccion_desactivada" && event.resultado === "exitoso") ||
    (event.tipoEvento === "cambio_permiso" && event.resultado === "detectado") ||
    (event.tipoEvento === "intento_bypass" && event.resultado === "detectado")
  ) {
    nextStatus = "advertencia";
  }

  if (!nextStatus) {
    return {};
  }

  const previousSequence = Number.isSafeInteger(device.ultimaSecuenciaEstado)
    ? device.ultimaSecuenciaEstado
    : 0;
  if (event.secuencia <= previousSequence) {
    return {};
  }

  return {
    estado: nextStatus,
    ultimaSecuenciaEstado: event.secuencia
  };
}

async function listDevicesForResponsible(responsibleId) {
  const snapshot = await db
    .collection(DEVICE_COLLECTION)
    .where("responsablesIds", "array-contains", responsibleId)
    .get();

  const devices = await Promise.all(snapshot.docs.map(async (deviceDocument) => {
    const device = deviceDocument.data();
    const profileSnapshot = await deviceDocument.ref
      .collection(PROTECTED_PROFILE_COLLECTION)
      .doc(PROTECTED_PROFILE_DOCUMENT)
      .get();
    const profile = profileSnapshot.exists ? profileSnapshot.data() : null;

    return {
      id: deviceDocument.id,
      nombre: device.nombre,
      estado: device.estado,
      plataforma: device.plataforma,
      versionApp: device.versionApp,
      ultimoReporte: toIsoString(device.ultimoReporte),
      fechaVinculacion: toIsoString(device.fechaVinculacion),
      perfil: profile
        ? {
            nombre: profile.nombre,
            apellido: profile.apellido,
            parentesco: profile.parentesco
          }
        : null
    };
  }));

  return devices.sort((left, right) =>
    (right.fechaVinculacion || "").localeCompare(left.fechaVinculacion || "")
  );
}

async function getDeviceEvents({ responsibleId, deviceId, limit }) {
  const deviceRef = db.collection(DEVICE_COLLECTION).doc(deviceId);
  const deviceSnapshot = await deviceRef.get();

  if (!deviceSnapshot.exists) {
    throw new HttpError(404, "device_not_found", "El dispositivo no existe.");
  }

  const device = deviceSnapshot.data();
  if (
    !Array.isArray(device.responsablesIds) ||
    !device.responsablesIds.includes(responsibleId)
  ) {
    throw new HttpError(
      403,
      "device_access_denied",
      "El responsable no está vinculado a este dispositivo."
    );
  }

  const eventsSnapshot = await deviceRef
    .collection("eventos")
    .orderBy("timestampServidor", "desc")
    .limit(limit)
    .get();

  return eventsSnapshot.docs.map((eventDocument) => {
    const event = eventDocument.data();
    return {
      ...event,
      eventoId: eventDocument.id,
      timestampDispositivo: toIsoString(event.timestampDispositivo),
      timestampServidor: toIsoString(event.timestampServidor)
    };
  });
}

async function recordDeviceEvent({ deviceId, authenticatedDeviceId, rawEvent }) {
  if (authenticatedDeviceId !== deviceId) {
    throw new HttpError(
      403,
      "device_access_denied",
      "El token no pertenece al dispositivo indicado."
    );
  }

  const event = validateEvent(rawEvent);
  const deviceRef = db.collection(DEVICE_COLLECTION).doc(deviceId);
  const eventRef = deviceRef.collection("eventos").doc(event.eventoId);

  const created = await db.runTransaction(async (transaction) => {
    const [deviceSnapshot, eventSnapshot] = await Promise.all([
      transaction.get(deviceRef),
      transaction.get(eventRef)
    ]);

    if (!deviceSnapshot.exists) {
      throw new HttpError(404, "device_not_found", "El dispositivo no existe.");
    }

    transaction.update(deviceRef, {
      ultimoReporte: FieldValue.serverTimestamp(),
      ...(!eventSnapshot.exists
        ? eventStatusUpdate(event, deviceSnapshot.data())
        : {})
    });

    if (eventSnapshot.exists) {
      return false;
    }

    transaction.create(eventRef, {
      ...event,
      dispositivoId: deviceId,
      timestampServidor: FieldValue.serverTimestamp()
    });
    return true;
  });

  return { created, eventoId: event.eventoId };
}

function parseEventLimit(value) {
  if (value === undefined) {
    return 50;
  }

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new HttpError(400, "invalid_event_limit", "limit debe ser un entero entre 1 y 100.");
  }

  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_EVENTS_PER_REQUEST) {
    throw new HttpError(400, "invalid_event_limit", "limit debe ser un entero entre 1 y 100.");
  }

  return limit;
}

module.exports = {
  getDeviceEvents,
  listDevicesForResponsible,
  parseEventLimit,
  recordDeviceEvent
};
