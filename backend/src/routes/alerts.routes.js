const express = require("express");
const { requireFirebaseAuth, requireProvider } = require("../middleware/authenticateFirebase");
const {
  getAlertsForResponsible,
  markAlertRead,
  parseAlertLimit
} = require("../services/alerts.service");
const { HttpError } = require("../errors/HttpError");

const router = express.Router();

router.get(
  "/",
  requireFirebaseAuth,
  requireProvider("password"),
  async (req, res, next) => {
    try {
      const limit = parseAlertLimit(req.query.limit);
      const alertas = await getAlertsForResponsible({
        responsibleId: req.firebaseUser.uid,
        limit
      });
      return res.status(200).json({ alertas });
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
  "/:alertId/read",
  requireFirebaseAuth,
  requireProvider("password"),
  async (req, res, next) => {
    try {
      await markAlertRead({
        responsibleId: req.firebaseUser.uid,
        alertaId: req.params.alertId
      });
      return res.status(200).json({ leida: true });
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
