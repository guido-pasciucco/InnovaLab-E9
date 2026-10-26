const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../config/firebase");
const { HttpError } = require("../errors/HttpError");

const RESPONSIBLE_COLLECTION = "responsables";

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

async function createResponsibleProfile({ uid, email, nombre, fechaNacimiento }) {
  if (!nombre || nombre.length > 100) {
    throw new HttpError(
      400,
      "invalid_name",
      "El nombre es obligatorio y no puede superar 100 caracteres."
    );
  }

  if (!isIsoDate(fechaNacimiento)) {
    throw new HttpError(
      400,
      "invalid_birth_date",
      "La fecha de nacimiento debe ser válida y usar el formato YYYY-MM-DD."
    );
  }

  if (typeof email !== "string" || !email) {
    throw new HttpError(
      403,
      "email_required",
      "La cuenta autenticada no tiene un email disponible."
    );
  }

  const responsibleRef = db.collection(RESPONSIBLE_COLLECTION).doc(uid);

  const created = await db.runTransaction(async (transaction) => {
    const profileSnapshot = await transaction.get(responsibleRef);

    if (profileSnapshot.exists) {
      const profile = profileSnapshot.data();
      const sameProfile = profile.nombre === nombre &&
        profile.fechaNacimiento === fechaNacimiento &&
        profile.email === email;

      if (!sameProfile) {
        throw new HttpError(
          409,
          "responsible_profile_already_exists",
          "Ya existe un perfil distinto para esta cuenta."
        );
      }

      return false;
    }

    transaction.create(responsibleRef, {
      nombre,
      fechaNacimiento,
      email,
      fechaCreacion: FieldValue.serverTimestamp()
    });

    return true;
  });

  return { created, uid };
}

module.exports = { createResponsibleProfile };
