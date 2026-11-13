const { auth } = require("../config/firebase");

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

module.exports = { requireFirebaseAuth, requireProvider };
