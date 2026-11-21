const crypto = require("node:crypto");
const { promisify } = require("node:util");
const { db } = require("../config/firebase");
const { HttpError } = require("../errors/HttpError");

const scrypt = promisify(crypto.scrypt);
const RESPONSIBLE_COLLECTION = "responsables";
const DEVICE_COLLECTION = "dispositivos";
const SECURITY_COLLECTION = "seguridad";
const SECURITY_DOCUMENT = "pin";
const HASH_ALGORITHM = "pin-v1";
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const HASH_LENGTH = 32;
const SALT_LENGTH = 16;
const MAX_FAILED_ATTEMPTS = 3;
const LOCK_DURATIONS_MS = [30_000, 120_000, 600_000, 1_800_000];
const RECENT_VERIFICATION_MS = 5 * 60 * 1000;

function getPinPepper() {
  const pepper = process.env.PIN_PEPPER;
  if (typeof pepper !== "string" || Buffer.byteLength(pepper, "utf8") < 32) {
    throw new HttpError(
      503,
      "pin_service_unavailable",
      "La verificación segura del PIN no está configurada."
    );
  }

  return pepper;
}

function validatePin(value, forSetup = false) {
  if (typeof value !== "string" || !/^\d{4}$/.test(value)) {
    throw new HttpError(400, "invalid_pin", "El PIN debe tener cuatro dígitos.");
  }

  if (forSetup && (/^(\d)\1{3}$/.test(value) || value === "1234")) {
    throw new HttpError(400, "weak_pin", "Elegí un PIN menos fácil de adivinar.");
  }

  return value;
}

function securityRef(parentRef) {
  return parentRef.collection(SECURITY_COLLECTION).doc(SECURITY_DOCUMENT);
}

function readState(snapshot) {
  const data = snapshot.exists ? snapshot.data() : {};
  return {
    failedAttempts: Number.isSafeInteger(data.failedAttempts) && data.failedAttempts >= 0
      ? data.failedAttempts
      : 0,
    lockLevel: Number.isSafeInteger(data.lockLevel) && data.lockLevel >= 0
      ? Math.min(data.lockLevel, LOCK_DURATIONS_MS.length - 1)
      : 0,
    lockedUntil: Number.isSafeInteger(data.lockedUntil) && data.lockedUntil >= 0
      ? data.lockedUntil
      : 0
  };
}

function createLockedError(remainingMs) {
  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
  const error = new HttpError(
    429,
    "pin_locked",
    `Demasiados intentos. Probá de nuevo en ${seconds} segundos.`
  );
  error.retryAfterSeconds = seconds;
  return error;
}

function assertNotLocked(stateSnapshot) {
  const remainingMs = readState(stateSnapshot).lockedUntil - Date.now();
  if (remainingMs > 0) {
    throw createLockedError(remainingMs);
  }
}

function deriveInput(pin, pepper) {
  return crypto.createHmac("sha256", pepper).update(pin, "utf8").digest();
}

async function deriveHash(pin, salt, pepper) {
  return scrypt(deriveInput(pin, pepper), salt, HASH_LENGTH, SCRYPT_OPTIONS);
}

async function createPinHash(pin, pepper) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = await deriveHash(pin, salt, pepper);
  return [
    HASH_ALGORITHM,
    SCRYPT_OPTIONS.N,
    SCRYPT_OPTIONS.r,
    SCRYPT_OPTIONS.p,
    salt.toString("base64"),
    hash.toString("base64")
  ].join("$");
}

async function matchesPin(pin, encodedHash, pepper) {
  if (typeof encodedHash !== "string") {
    throw new Error("Stored PIN hash is invalid.");
  }

  const [algorithm, n, r, p, saltValue, hashValue, extra] = encodedHash.split("$");
  if (
    algorithm !== HASH_ALGORITHM ||
    n !== String(SCRYPT_OPTIONS.N) ||
    r !== String(SCRYPT_OPTIONS.r) ||
    p !== String(SCRYPT_OPTIONS.p) ||
    !saltValue ||
    !hashValue ||
    extra !== undefined
  ) {
    throw new Error("Stored PIN hash has an unsupported format.");
  }

  const salt = Buffer.from(saltValue, "base64");
  const expected = Buffer.from(hashValue, "base64");
  if (salt.length !== SALT_LENGTH || expected.length !== HASH_LENGTH) {
    throw new Error("Stored PIN hash has invalid lengths.");
  }

  const actual = await deriveHash(pin, salt, pepper);
  return crypto.timingSafeEqual(actual, expected);
}

function resetState(now, verifiedAt = 0) {
  return {
    failedAttempts: 0,
    lockLevel: 0,
    lockedUntil: 0,
    verifiedAt,
    updatedAt: now
  };
}

async function setResponsiblePin(responsibleId, rawPin) {
  const pin = validatePin(rawPin, true);
  const pepper = getPinPepper();
  const pinHash = await createPinHash(pin, pepper);
  const responsibleRef = db.collection(RESPONSIBLE_COLLECTION).doc(responsibleId);
  const attemptsRef = securityRef(responsibleRef);

  await db.runTransaction(async (transaction) => {
    const [responsibleSnapshot, attemptsSnapshot] = await Promise.all([
      transaction.get(responsibleRef),
      transaction.get(attemptsRef)
    ]);

    if (!responsibleSnapshot.exists) {
      throw new HttpError(
        404,
        "responsible_profile_not_found",
        "No existe un perfil de responsable asociado a esta cuenta."
      );
    }

    const currentPinHash = responsibleSnapshot.get("pinHash");
    if (currentPinHash) {
      const verifiedAt = attemptsSnapshot.exists
        ? attemptsSnapshot.get("verifiedAt")
        : 0;
      const age = Date.now() - verifiedAt;
      if (!Number.isFinite(verifiedAt) || age < 0 || age > RECENT_VERIFICATION_MS) {
        throw new HttpError(
          403,
          "pin_reauthentication_required",
          "Verificá tu PIN actual antes de cambiarlo."
        );
      }
    }

    transaction.update(responsibleRef, {
      pinHash,
      pinUpdatedAt: new Date()
    });
    transaction.set(attemptsRef, resetState(Date.now()));
  });
}

async function verifyPinCandidates({ pin, securityDocumentRef, candidates, guards = [] }) {
  const stateSnapshot = await securityDocumentRef.get();
  assertNotLocked(stateSnapshot);

  const pepper = getPinPepper();
  let valid = false;
  for (const candidate of candidates) {
    const matches = await matchesPin(pin, candidate.pinHash, pepper);
    valid = matches || valid;
  }

  return db.runTransaction(async (transaction) => {
    const refs = [
      securityDocumentRef,
      ...candidates.map((candidate) => candidate.ref),
      ...guards.map((guard) => guard.ref)
    ];
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
    const currentState = snapshots[0];
    assertNotLocked(currentState);

    const candidateSnapshots = snapshots.slice(1, 1 + candidates.length);
    const pinChanged = candidates.some((candidate, index) =>
      !candidateSnapshots[index].exists ||
      candidateSnapshots[index].get("pinHash") !== candidate.pinHash
    );
    if (pinChanged) {
      throw new HttpError(
        409,
        "pin_changed",
        "El PIN cambió durante la verificación. Intenta nuevamente."
      );
    }

    const guardSnapshots = snapshots.slice(1 + candidates.length);
    if (guards.some((guard, index) => !guard.isValid(guardSnapshots[index]))) {
      throw new HttpError(
        403,
        "pin_verification_not_authorized",
        "La cuenta ya no está autorizada para verificar el PIN de este dispositivo."
      );
    }

    const state = readState(currentState);
    const now = Date.now();
    if (valid) {
      transaction.set(securityDocumentRef, resetState(now, now));
      return true;
    }

    const failures = state.failedAttempts + 1;
    if (failures >= MAX_FAILED_ATTEMPTS) {
      const duration = LOCK_DURATIONS_MS[state.lockLevel];
      transaction.set(securityDocumentRef, {
        ...state,
        failedAttempts: 0,
        lockLevel: Math.min(state.lockLevel + 1, LOCK_DURATIONS_MS.length - 1),
        lockedUntil: now + duration,
        verifiedAt: 0,
        updatedAt: now
      });
      return false;
    }

    transaction.set(securityDocumentRef, {
      ...state,
      failedAttempts: failures,
      lockedUntil: 0,
      verifiedAt: 0,
      updatedAt: now
    });
    return false;
  });
}

async function verifyResponsiblePin(responsibleId, rawPin) {
  const pin = validatePin(rawPin);
  const responsibleRef = db.collection(RESPONSIBLE_COLLECTION).doc(responsibleId);
  const responsibleSnapshot = await responsibleRef.get();

  if (!responsibleSnapshot.exists) {
    throw new HttpError(
      404,
      "responsible_profile_not_found",
      "No existe un perfil de responsable asociado a esta cuenta."
    );
  }

  const pinHash = responsibleSnapshot.get("pinHash");
  if (typeof pinHash !== "string" || !pinHash) {
    throw new HttpError(409, "pin_not_configured", "Todavía no configuraste un PIN.");
  }

  return verifyPinCandidates({
    pin,
    securityDocumentRef: securityRef(responsibleRef),
    candidates: [{ ref: responsibleRef, pinHash }]
  });
}

async function verifyDevicePin(deviceId, rawPin) {
  const pin = validatePin(rawPin);
  const deviceRef = db.collection(DEVICE_COLLECTION).doc(deviceId);
  const deviceSnapshot = await deviceRef.get();

  if (!deviceSnapshot.exists) {
    throw new HttpError(404, "device_not_found", "El dispositivo no existe.");
  }

  const responsibleIds = deviceSnapshot.get("responsablesIds");
  if (!Array.isArray(responsibleIds) || responsibleIds.length === 0) {
    throw new HttpError(
      403,
      "device_access_denied",
      "El dispositivo no tiene responsables vinculados."
    );
  }

  const responsibleRefs = [...new Set(responsibleIds)]
    .filter((id) => typeof id === "string" && id.length > 0)
    .map((id) => db.collection(RESPONSIBLE_COLLECTION).doc(id));
  const responsibleSnapshots = await Promise.all(responsibleRefs.map((ref) => ref.get()));
  const candidates = responsibleSnapshots.flatMap((snapshot, index) => {
    const pinHash = snapshot.exists ? snapshot.get("pinHash") : null;
    return typeof pinHash === "string" && pinHash
      ? [{ ref: responsibleRefs[index], pinHash }]
      : [];
  });

  if (candidates.length === 0) {
    throw new HttpError(409, "pin_not_configured", "Ningún responsable vinculado configuró un PIN.");
  }

  return verifyPinCandidates({
    pin,
    securityDocumentRef: securityRef(deviceRef),
    candidates,
    guards: [{
      ref: deviceRef,
      isValid: (snapshot) => snapshot.exists &&
        Array.isArray(snapshot.get("responsablesIds")) &&
        candidates.every((candidate) =>
          snapshot.get("responsablesIds").includes(candidate.ref.path.split("/")[1])
        )
    }]
  });
}

module.exports = {
  setResponsiblePin,
  verifyDevicePin,
  verifyResponsiblePin
};
