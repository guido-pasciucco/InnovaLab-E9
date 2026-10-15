const crypto = require("node:crypto");
const path = require("node:path");
const express = require("express");
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, getFirestore } = require("firebase-admin/firestore");

const serviceAccount = require(
  path.join(__dirname, "serviceAccountKey.json")
);

initializeApp({
  credential: cert(serviceAccount)
});

const auth = getAuth();
const db = getFirestore();
const app = express();
const port = process.env.PORT || 3000;
const LINK_CODE_COLLECTION = "codigosVinculacion";
const RESPONSIBLE_COLLECTION = "responsables";
const DEVICE_COLLECTION = "dispositivos";
const LINK_CODE_TTL_MS = 15 * 60 * 1000;
const LINK_CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

app.use(express.json());

function requireFirebaseAuth(req, res, next) {
  const authorization = req.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return res
      .status(401)
      .set("WWW-Authenticate", "Bearer")
      .json({ error: "Falta un token Bearer válido." });
  }

  auth.verifyIdToken(match[1])
    .then((decodedToken) => {
      req.firebaseUser = decodedToken;
      next();
    })
    .catch((error) => {
      const invalidTokenCodes = new Set([
        "auth/argument-error",
        "auth/id-token-expired",
        "auth/id-token-revoked",
        "auth/invalid-id-token",
        "auth/user-disabled",
        "auth/user-not-found"
      ]);

      if (invalidTokenCodes.has(error.code)) {
        return res.status(401).json({ error: "El token es inválido o venció." });
      }

      return next(error);
    });
}

function requireProvider(provider) {
  return (req, res, next) => {
    if (req.firebaseUser.firebase.sign_in_provider !== provider) {
      return res.status(403).json({
        error: "El proveedor de autenticación no está permitido para esta operación."
      });
    }

    return next();
  };
}

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

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/test-auth", requireFirebaseAuth, (req, res) => {
  const provider = req.firebaseUser.firebase.sign_in_provider;

  if (provider !== "password" && provider !== "anonymous") {
    return res.status(403).json({
      error: "Este proveedor de autenticación no está permitido para la prueba."
    });
  }

  return res.status(200).json({
    authenticated: true,
    uid: req.firebaseUser.uid,
    provider
  });
});

app.post(
  "/api/link-codes",
  requireFirebaseAuth,
  requireProvider("password"),
  async (req, res, next) => {
    try {
      const responsibleRef = db
        .collection(RESPONSIBLE_COLLECTION)
        .doc(req.firebaseUser.uid);
      const responsible = await responsibleRef.get();

      if (!responsible.exists) {
        throw new HttpError(
          409,
          "responsible_profile_not_found",
          "No existe un perfil de responsable asociado a esta cuenta."
        );
      }

      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + LINK_CODE_TTL_MS);
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
            responsableId: req.firebaseUser.uid,
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

      return res.status(201).json({
        codigo: code,
        expiraEn: expiresAt.toISOString()
      });
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({
          error: error.code,
          message: error.message
        });
      }

      return next(error);
    }
  }
);

app.post(
  "/api/link-codes/redeem",
  requireFirebaseAuth,
  requireProvider("anonymous"),
  async (req, res, next) => {
    const codigo = normalizeLinkCode(req.body?.codigo);
    const nombre = typeof req.body?.nombreDispositivo === "string"
      ? req.body.nombreDispositivo.trim()
      : "";
    const plataforma = typeof req.body?.plataforma === "string"
      ? req.body.plataforma.trim()
      : "";
    const versionApp = typeof req.body?.versionApp === "string"
      ? req.body.versionApp.trim()
      : "";

    if (!codigo) {
      return res.status(400).json({
        error: "invalid_code_format",
        message: "El código debe contener seis caracteres alfanuméricos."
      });
    }

    if (!nombre || nombre.length > 80 || !plataforma || plataforma.length > 30 ||
        !versionApp || versionApp.length > 30) {
      return res.status(400).json({
        error: "invalid_device_data",
        message: "Nombre, plataforma y versión de la app son obligatorios y deben tener un formato válido."
      });
    }

    const codeRef = db.collection(LINK_CODE_COLLECTION).doc(codigo);
    const deviceRef = db
      .collection(DEVICE_COLLECTION)
      .doc(req.firebaseUser.uid);

    try {
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
          uid: req.firebaseUser.uid,
          nombre,
          estado: "sin_configurar",
          responsablesIds: [codeData.responsableId],
          plataforma,
          versionApp,
          fechaVinculacion: FieldValue.serverTimestamp()
        });

        transaction.update(codeRef, {
          usado: true,
          dispositivoId: req.firebaseUser.uid,
          usadoEn: FieldValue.serverTimestamp()
        });

        return { responsableId: codeData.responsableId };
      });

      return res.status(200).json({
        vinculacion: "completada",
        dispositivoId: req.firebaseUser.uid,
        responsableId: result.responsableId
      });
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({
          error: error.code,
          message: error.message
        });
      }

      return next(error);
    }
  }
);

app.use((error, req, res, next) => {
  console.error("Error no controlado en la API:", error);
  return res.status(500).json({
    error: "internal_error",
    message: "Ocurrió un error interno."
  });
});

app.listen(port, () => {
  console.log(`API escuchando en el puerto ${port}`);
  console.log("Ctrl + C para finalizar.");
});
