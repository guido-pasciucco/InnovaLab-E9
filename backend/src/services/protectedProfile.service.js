const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../config/firebase");
const { HttpError } = require("../errors/HttpError");

const DEVICE_COLLECTION = "dispositivos";
const PROTECTED_PROFILE_COLLECTION = "perfilProtegido";
const PROTECTED_PROFILE_DOCUMENT = "datos";

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    value <= new Date().toISOString().slice(0, 10);
}

async function createProtectedProfile({
  responsibleId,
  deviceId,
  nombre,
  apellido,
  fechaNacimiento,
  parentesco
}) {
  if (!nombre || nombre.length > 80 ||
      !apellido || apellido.length > 80 ||
      !parentesco || parentesco.length > 50) {
    throw new HttpError(
      400,
      "invalid_protected_profile",
      "Nombre, apellido y parentesco son obligatorios y deben tener un formato válido."
    );
  }

  if (!isIsoDate(fechaNacimiento)) {
    throw new HttpError(
      400,
      "invalid_birth_date",
      "La fecha de nacimiento debe ser válida y usar el formato YYYY-MM-DD."
    );
  }

  const deviceRef = db.collection(DEVICE_COLLECTION).doc(deviceId);
  const profileRef = deviceRef
    .collection(PROTECTED_PROFILE_COLLECTION)
    .doc(PROTECTED_PROFILE_DOCUMENT);

  const created = await db.runTransaction(async (transaction) => {
    const [deviceSnapshot, profileSnapshot] = await Promise.all([
      transaction.get(deviceRef),
      transaction.get(profileRef)
    ]);

    if (!deviceSnapshot.exists) {
      throw new HttpError(404, "device_not_found", "El dispositivo no existe.");
    }

    const device = deviceSnapshot.data();
    if (!Array.isArray(device.responsablesIds) ||
        !device.responsablesIds.includes(responsibleId)) {
      throw new HttpError(
        403,
        "device_access_denied",
        "El responsable no está vinculado a este dispositivo."
      );
    }

    if (profileSnapshot.exists) {
      const profile = profileSnapshot.data();
      const sameProfile = profile.nombre === nombre &&
        profile.apellido === apellido &&
        profile.fechaNacimiento === fechaNacimiento &&
        profile.parentesco === parentesco;

      if (!sameProfile) {
        throw new HttpError(
          409,
          "protected_profile_already_exists",
          "Ya existe un perfil protegido distinto para este dispositivo."
        );
      }

      return false;
    }

    transaction.create(profileRef, {
      nombre,
      apellido,
      fechaNacimiento,
      parentesco,
      creadoEn: FieldValue.serverTimestamp()
    });

    return true;
  });

  return { created, deviceId };
}

module.exports = { createProtectedProfile };
