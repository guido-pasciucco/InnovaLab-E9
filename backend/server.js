const express = require("express");
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const path = require("node:path");

const serviceAccount = require(
  path.join(__dirname, "serviceAccountKey.json")
);

initializeApp({
  credential: cert(serviceAccount)
});

const auth = getAuth();
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/test-auth", async (req, res) => {
  const authorization = req.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return res
      .status(401)
      .set("WWW-Authenticate", "Bearer")
      .json({ error: "Falta un token Bearer válido." });
  }

  try {
    const decodedToken = await auth.verifyIdToken(match[1]);
    const provider = decodedToken.firebase.sign_in_provider;

    if (provider !== "password" && provider !== "anonymous") {
      return res.status(403).json({
        error: "Este proveedor de autenticación no está permitido para la prueba."
      });
    }

    return res.status(200).json({
      authenticated: true,
      uid: decodedToken.uid,
      provider
    });
  } catch {
    return res.status(401).json({
      error: "El token es inválido o venció."
    });
  }
});

app.listen(port, () => {
  console.log(`API escuchando en el puerto ${port}`);
  console.log("Ctrl + C para finalizar.");
});