const express = require("express");
const { requireFirebaseAuth, requireProvider } = require("../middleware/authenticateFirebase");
const { createProtectedProfile } = require("../services/protectedProfile.service");
const { HttpError } = require("../errors/HttpError");

const router = express.Router();

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
