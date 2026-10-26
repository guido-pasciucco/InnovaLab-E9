const express = require("express");
const { requireFirebaseAuth, requireProvider } = require("../middleware/authenticateFirebase");
const { createResponsibleProfile } = require("../services/responsible.service");
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

module.exports = router;
