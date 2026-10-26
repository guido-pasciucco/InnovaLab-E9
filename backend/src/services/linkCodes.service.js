const crypto = require("node:crypto");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../config/firebase");
const { HttpError } = require("../errors/HttpError");

const LINK_CODE_COLLECTION = "codigosVinculacion";
const RESPONSIBLE_COLLECTION = "responsables";
const DEVICE_COLLECTION = "dispositivos";
const LINK_CODE_TTL_MS = 15 * 60 * 1000;
const LINK_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateLinkCode() {
  return Array.from(
    { length: 6 },
    () => LINK_CODE_ALPHABET[crypto.randomInt(LINK_CODE_ALPHABET.length)]
  ).join("");
}

function normalizeLinkCode(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/[\s-]/g, "").toUpperCase();
  return /^[A-Z0-9]{6}$/.test(normalized) ? normalized : null;
}

function getExpiryMillis(value) {
  if (value && typeof value.toMillis === "function") {
    return value.toMillis();
  }

  const expiryMillis = new Date(value).getTime();
  return Number.isFinite(expiryMillis) ? expiryMillis : null;
}

async function createLinkCode(responsibleId) {
  const responsibleRef = db
    .collection(RESPONSIBLE_COLLECTION)
    .doc(responsibleId);
  const responsible = await responsibleRef.get();

  if (!responsible.exists) {
    throw new HttpError(
      409,
      "responsible_profile_not_found",
      "No existe un perfil de responsable asociado a esta cuenta."
    );
  }

  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS);
  let code;
  let codeCreated = false;

  for (let attempt = 0; attempt < 5 && !codeCreated; attempt += 1) {
    code = generateLinkCode();
    const codeRef = db.collection(LINK_CODE_COLLECTION).doc(code);

    codeCreated = await db.runTransaction(async (transaction) => {
      const existingCode = await transaction.get(codeRef);

      if (existingCode.exists) {
        return false;
      }

      transaction.create(codeRef, {
        codigo: code,
        responsableId: responsibleId,
        creadoEn: FieldValue.serverTimestamp(),
        expiraEn: expiresAt,
        usado: false
      });

      return true;
    });
  }

  if (!codeCreated) {
    throw new HttpError(
      503,
      "link_code_generation_failed",
      "No se pudo generar un código único. Intenta nuevamente."
    );
  }

  return { codigo: code, expiraEn: expiresAt.toISOString() };
}

async function redeemLinkCode({ deviceId, codigo: rawCode, nombre, plataforma, versionApp }) {
  const codigo = normalizeLinkCode(rawCode);

  if (!codigo) {
    throw new HttpError(
      400,
      "invalid_code_format",
      "El código debe contener seis caracteres alfanuméricos."
    );
  }

  if (!nombre || nombre.length > 80 || !plataforma || plataforma.length > 30 ||
      !versionApp || versionApp.length > 30) {
    throw new HttpError(
      400,
      "invalid_device_data",
      "Nombre, plataforma y versión de la app son obligatorios y deben tener un formato válido."
    );
  }

  const codeRef = db.collection(LINK_CODE_COLLECTION).doc(codigo);
  const deviceRef = db.collection(DEVICE_COLLECTION).doc(deviceId);

  const result = await db.runTransaction(async (transaction) => {
    const codeSnapshot = await transaction.get(codeRef);

    if (!codeSnapshot.exists) {
      throw new HttpError(404, "link_code_not_found", "El código no existe.");
    }

    const codeData = codeSnapshot.data();
    const expiryMillis = getExpiryMillis(codeData.expiraEn);

    if (expiryMillis === null) {
      throw new Error("El código de vinculación tiene una fecha de expiración inválida.");
    }

    if (expiryMillis <= Date.now()) {
      throw new HttpError(410, "link_code_expired", "El código venció.");
    }

    if (codeData.usado) {
      throw new HttpError(409, "link_code_already_used", "El código ya fue utilizado.");
    }

    if (typeof codeData.responsableId !== "string" || !codeData.responsableId) {
      throw new Error("El código de vinculación no tiene un responsable asociado.");
    }

    const responsibleRef = db
      .collection(RESPONSIBLE_COLLECTION)
      .doc(codeData.responsableId);
    const [responsibleSnapshot, deviceSnapshot] = await Promise.all([
      transaction.get(responsibleRef),
      transaction.get(deviceRef)
    ]);

    if (!responsibleSnapshot.exists) {
      throw new HttpError(
        409,
        "responsible_profile_not_found",
        "El perfil del responsable ya no existe."
      );
    }

    if (deviceSnapshot.exists) {
      throw new HttpError(
        409,
        "device_already_registered",
        "Este dispositivo ya tiene un registro en el sistema."
      );
    }

    transaction.create(deviceRef, {
      uid: deviceId,
      nombre,
      estado: "sin_configurar",
      responsablesIds: [codeData.responsableId],
      plataforma,
      versionApp,
      fechaVinculacion: FieldValue.serverTimestamp()
    });

    transaction.update(codeRef, {
      usado: true,
      dispositivoId: deviceId,
      usadoEn: FieldValue.serverTimestamp()
    });

    return { responsableId: codeData.responsableId };
  });

  return {
    vinculacion: "completada",
    dispositivoId: deviceId,
    responsableId: result.responsableId
  };
}

module.exports = { createLinkCode, redeemLinkCode };
