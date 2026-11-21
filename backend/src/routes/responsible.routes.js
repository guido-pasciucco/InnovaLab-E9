const express = require("express");
const { requireFirebaseAuth, requireProvider } = require("../middleware/authenticateFirebase");
const { createResponsibleProfile } = require("../services/responsible.service");
const {
  setResponsiblePin,
  verifyResponsiblePin
} = require("../services/pin.service");
const { HttpError } = require("../errors/HttpError");

const router = express.Router();

router.post(
  "/",
  requireFirebaseAuth,
  requireProvider("password"),
  async (req, res, next) => {
    try {
      const result = await createResponsibleProfile({
        uid: req.firebaseUser.uid,
        email: req.firebaseUser.email,
        nombre: typeof req.body?.nombre === "string"
          ? req.body.nombre.trim()
          : "",
        fechaNacimiento: req.body?.fechaNacimiento
      });

      return res.status(result.created ? 201 : 200).json({
        perfilCreado: true,
        yaExistia: !result.created,
        responsableId: result.uid
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

router.put(
  "/pin",
  requireFirebaseAuth,
  requireProvider("password"),
  async (req, res, next) => {
    try {
      await setResponsiblePin(req.firebaseUser.uid, req.body?.pin);
      return res.status(200).json({ pinConfigurado: true });
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

router.post(
  "/pin/verify",
  requireFirebaseAuth,
  requireProvider("password"),
  async (req, res, next) => {
    try {
      const valido = await verifyResponsiblePin(req.firebaseUser.uid, req.body?.pin);
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

module.exports = router;
