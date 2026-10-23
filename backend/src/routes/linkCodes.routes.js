const express = require("express");
const { requireFirebaseAuth, requireProvider } = require("../middleware/authenticateFirebase");
const { createLinkCode, redeemLinkCode } = require("../services/linkCodes.service");
const { HttpError } = require("../errors/HttpError");

const router = express.Router();

router.post(
  "/",
  requireFirebaseAuth,
  requireProvider("password"),
  async (req, res, next) => {
    try {
      const result = await createLinkCode(req.firebaseUser.uid);
      return res.status(201).json(result);
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
  "/redeem",
  requireFirebaseAuth,
  requireProvider("anonymous"),
  async (req, res, next) => {
    try {
      const result = await redeemLinkCode({
        deviceId: req.firebaseUser.uid,
        codigo: req.body?.codigo,
        nombre: typeof req.body?.nombreDispositivo === "string"
          ? req.body.nombreDispositivo.trim()
          : "",
        plataforma: typeof req.body?.plataforma === "string"
          ? req.body.plataforma.trim()
          : "",
        versionApp: typeof req.body?.versionApp === "string"
          ? req.body.versionApp.trim()
          : ""
      });

      return res.status(200).json(result);
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
