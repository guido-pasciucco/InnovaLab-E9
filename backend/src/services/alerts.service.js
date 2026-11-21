const crypto = require("node:crypto");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../config/firebase");
const { HttpError } = require("../errors/HttpError");

const ALERT_COLLECTION = "alertas";
const MAX_ALERTS_PER_REQUEST = 100;
const ALERT_TYPES = new Set([
  "proteccion_desactivada",
  "cambio_permiso",
  "intento_bypass",
  "intento_instalacion"
]);
const PERMISSION_LABELS = {
  vpn: "el filtro (VPN)",
  accesibilidad: "la Accesibilidad",
  device_admin: "el administrador del dispositivo"
};
const CONFIGURATION_LABELS = {
  desactivar_proteccion: "desactivar la protección",
  desvincular_dispositivo: "desvincular el dispositivo",
  cambiar_pin: "cambiar el PIN",
  editar_lista_personalizada: "editar los sitios personalizados"
};
const BYPASS_LABELS = {
  dns_privado: "Se activó el DNS privado, que puede saltear el filtro",
  vpn_externa: "Se activó otra VPN",
  accesibilidad_desactivada: "Se desactivó la Accesibilidad de BA Protege+",
  device_admin_desactivado: "Se quitó el administrador del dispositivo",
  proceso_terminado: "El sistema cerró la protección y se reinició sola"
};

function isAlertWorthy(event) {
  return ALERT_TYPES.has(event.tipoEvento) ||
    (event.tipoEvento === "intento_modificacion_config" &&
      event.resultado === "fallido");
}

function alertTitle(event) {
  if (event.tipoEvento === "proteccion_desactivada") {
    return "Protección desactivada";
  }

  if (event.tipoEvento === "cambio_permiso") {
    return `Se quitó el permiso de ${
      PERMISSION_LABELS[event.permiso] || "un permiso"
    }`;
  }

  if (event.tipoEvento === "intento_instalacion") {
    return `Se instaló una app que puede evadir el filtro (${event.paquete})`;
  }

  if (
    event.tipoEvento === "intento_modificacion_config" &&
    event.resultado === "fallido"
  ) {
    const configuration = CONFIGURATION_LABELS[event.configuracion] ||
      "cambiar la configuración";
    return `Intento de ${configuration} sin autorización`;
  }

  if (
    event.tipoEvento === "intento_bypass" &&
    event.tipoBypass === "dns_privado" &&
    event.resultado === "bloqueado"
  ) {
    return "Se frenó un intento de usar DNS cifrado";
  }

  return BYPASS_LABELS[event.tipoBypass] || "Se detectó un intento de evadir la protección";
}

function buildAlertRecord({ event, deviceId, device }) {
  if (!isAlertWorthy(event)) {
    return null;
  }

  const responsablesIds = [...new Set(
    Array.isArray(device.responsablesIds)
      ? device.responsablesIds.filter((id) => typeof id === "string" && id.length > 0)
      : []
  )];
  if (responsablesIds.length === 0) {
    return null;
  }

  const alertaId = crypto
    .createHash("sha256")
    .update(`${deviceId}:${event.eventoId}`)
    .digest("hex");
  const deviceName = typeof device.nombre === "string" && device.nombre.trim()
    ? device.nombre.trim()
    : "dispositivo protegido";

  return {
    alertaId,
    eventoOrigenId: event.eventoId,
    dispositivoId: deviceId,
    tipoEvento: event.tipoEvento,
    mensaje: `El dispositivo reportó: ${alertTitle(event)} (celular de ${deviceName}).`,
    fecha: FieldValue.serverTimestamp(),
    responsablesIds,
    responsablesLeidosIds: []
  };
}

function parseAlertLimit(value) {
  if (value === undefined) {
    return 50;
  }

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new HttpError(400, "invalid_alert_limit", "limit debe ser un entero entre 1 y 100.");
  }

  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_ALERTS_PER_REQUEST) {
    throw new HttpError(400, "invalid_alert_limit", "limit debe ser un entero entre 1 y 100.");
  }

  return limit;
}

function toIsoString(value) {
  if (!value) {
    return null;
  }

  const date = typeof value.toDate === "function" ? value.toDate() : value;
  return date instanceof Date && Number.isFinite(date.getTime())
    ? date.toISOString()
    : null;
}

async function getAlertsForResponsible({ responsibleId, limit }) {
  const snapshot = await db
    .collection(ALERT_COLLECTION)
    .where("responsablesIds", "array-contains", responsibleId)
    .orderBy("fecha", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((alertDocument) => {
    const alert = alertDocument.data();
    return {
      alertaId: alertDocument.id,
      eventoOrigenId: alert.eventoOrigenId,
      dispositivoId: alert.dispositivoId,
      tipoEvento: alert.tipoEvento,
      mensaje: alert.mensaje,
      fecha: toIsoString(alert.fecha),
      leida: Array.isArray(alert.responsablesLeidosIds) &&
        alert.responsablesLeidosIds.includes(responsibleId)
    };
  });
}

async function markAlertRead({ responsibleId, alertaId }) {
  if (typeof alertaId !== "string" || !/^[a-f0-9]{64}$/.test(alertaId)) {
    throw new HttpError(400, "invalid_alert_id", "El identificador de alerta no es válido.");
  }

  const alertRef = db.collection(ALERT_COLLECTION).doc(alertaId);
  return db.runTransaction(async (transaction) => {
    const alertSnapshot = await transaction.get(alertRef);
    if (!alertSnapshot.exists) {
      throw new HttpError(404, "alert_not_found", "La alerta no existe.");
    }

    const alert = alertSnapshot.data();
    if (
      !Array.isArray(alert.responsablesIds) ||
      !alert.responsablesIds.includes(responsibleId)
    ) {
      throw new HttpError(404, "alert_not_found", "La alerta no existe.");
    }

    const readBy = Array.isArray(alert.responsablesLeidosIds)
      ? alert.responsablesLeidosIds
      : [];
    if (readBy.includes(responsibleId)) {
      return false;
    }

    transaction.update(alertRef, {
      responsablesLeidosIds: [...readBy, responsibleId]
    });
    return true;
  });
}

module.exports = {
  buildAlertRecord,
  getAlertsForResponsible,
  markAlertRead,
  parseAlertLimit
};
