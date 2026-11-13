const express = require("express");
const { requireFirebaseAuth } = require("../middleware/authenticateFirebase");

const router = express.Router();

router.get("/test-auth", requireFirebaseAuth, (req, res) => {
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

module.exports = router;
