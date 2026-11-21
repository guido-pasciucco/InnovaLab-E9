const express = require("express");
const { requireFirebaseAuth, requireProvider } = require("../middleware/authenticateFirebase");
const { createProtectedProfile } = require("../services/protectedProfile.service");
const {
  getDeviceEvents,
  listDevicesForResponsible,
  parseEventLimit,
  recordDeviceEvent
} = require("../services/deviceEvents.service");
const { verifyDevicePin } = require("../services/pin.service");
const { HttpError } = require("../errors/HttpError");

const router = express.Router();

router.post(
  "/:deviceId/verify-pin",
  requireFirebaseAuth,
  requireProvider("anonymous"),
  async (req, res, next) => {
    try {
      if (req.firebaseUser.uid !== req.params.deviceId) {
        throw new HttpError(
          403,
          "device_access_denied",
          "El token no pertenece al dispositivo indicado."
        );
      }

      const valido = await verifyDevicePin(req.params.deviceId, req.body?.pin);
      return res.status(200).json({ valido });
    } catch (error) {
      if (error instanceof HttpError) {
        if (error.retryAfterSeconds) {
          res.set("Retry-After", String(error.retryAfterSeconds));
        }
        return res.status(error.status).json({
          error: error.code,
          message: error.message
        });
      }

      return next(error);
    }
  }
);

router.get(
  "/",
  requireFirebaseAuth,
  requireProvider("password"),
  async (req, res, next) => {
    try {
      const dispositivos = await listDevicesForResponsible(req.firebaseUser.uid);
      return res.status(200).json({ dispositivos });
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  "/:deviceId/events",
  requireFirebaseAuth,
  requireProvider("password"),
  async (req, res, next) => {
    try {
      const limit = parseEventLimit(req.query.limit);
      const eventos = await getDeviceEvents({
        responsibleId: req.firebaseUser.uid,
        deviceId: req.params.deviceId,
        limit
      });
      return res.status(200).json({ eventos });
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

router.post(
  "/:deviceId/events",
  requireFirebaseAuth,
  requireProvider("anonymous"),
  async (req, res, next) => {
    try {
      const result = await recordDeviceEvent({
        deviceId: req.params.deviceId,
        authenticatedDeviceId: req.firebaseUser.uid,
        rawEvent: req.body
      });
      return res.status(result.created ? 201 : 200).json({
        eventoRecibido: true,
        duplicado: !result.created,
        eventoId: result.eventoId
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

router.post(
  "/:deviceId/protected-profile",
  requireFirebaseAuth,
  requireProvider("password"),
  async (req, res, next) => {
    try {
      const result = await createProtectedProfile({
        responsibleId: req.firebaseUser.uid,
        deviceId: req.params.deviceId,
        nombre: typeof req.body?.nombre === "string"
          ? req.body.nombre.trim()
          : "",
        apellido: typeof req.body?.apellido === "string"
          ? req.body.apellido.trim()
          : "",
        fechaNacimiento: req.body?.fechaNacimiento,
        parentesco: typeof req.body?.parentesco === "string"
          ? req.body.parentesco.trim()
          : ""
      });

      return res.status(result.created ? 201 : 200).json({
        perfilCreado: true,
        yaExistia: !result.created,
        dispositivoId: result.deviceId
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

module.exports = router;
