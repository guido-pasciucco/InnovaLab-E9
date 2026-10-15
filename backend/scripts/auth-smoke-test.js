require("dotenv").config({ path: require("node:path").join(__dirname, "..", ".env") });

const mode = process.argv[2];
const linkCode = process.argv[3];

async function main() {
  const supportedModes = [
    "responsable",
    "anonimo",
    "crear-codigo",
    "canjear-codigo"
  ];

  if (!supportedModes.includes(mode)) {
    throw new Error(
      "Uso: node scripts/auth-smoke-test.js responsable|anonimo|crear-codigo|canjear-codigo [codigo]"
    );
  }

  if (mode === "canjear-codigo" && !linkCode) {
    throw new Error("Indica el código a canjear.");
  }

  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    throw new Error("Falta FIREBASE_WEB_API_KEY en backend/.env");
  }

  const authMode = mode === "crear-codigo" ? "responsable" :
    mode === "canjear-codigo" ? "anonimo" :
      mode;
  let authEndpoint;
  let authPayload;

  if (authMode === "responsable") {
    if (!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD) {
      throw new Error("Faltan TEST_EMAIL o TEST_PASSWORD en backend/.env");
    }

    authEndpoint = "signInWithPassword";
    authPayload = {
      email: process.env.TEST_EMAIL,
      password: process.env.TEST_PASSWORD,
      returnSecureToken: true
    };
  } else {
    authEndpoint = "signUp";
    authPayload = { returnSecureToken: true };
  }

  const authResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${authEndpoint}?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authPayload)
    }
  );

  const authResult = await authResponse.json();

  if (!authResponse.ok) {
    const firebaseError = authResult.error?.message || "Error de autenticación";
    throw new Error(`Firebase Auth rechazó la solicitud: ${firebaseError}`);
  }

  const apiUrl = process.env.API_URL || "http://localhost:3000";
  let endpoint = "/api/test-auth";
  let method = "GET";
  let requestBody;

  if (mode === "crear-codigo") {
    endpoint = "/api/link-codes";
    method = "POST";
  } else if (mode === "canjear-codigo") {
    endpoint = "/api/link-codes/redeem";
    method = "POST";
    requestBody = {
      codigo: linkCode,
      nombreDispositivo: process.env.TEST_DEVICE_NAME || "Dispositivo de prueba",
      plataforma: process.env.TEST_DEVICE_PLATFORM || "android",
      versionApp: process.env.TEST_APP_VERSION || "1.0.0"
    };
  }

  const apiResponse = await fetch(`${apiUrl}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${authResult.idToken}`,
      ...(requestBody ? { "Content-Type": "application/json" } : {})
    },
    ...(requestBody ? { body: JSON.stringify(requestBody) } : {})
  });

  const apiResult = await apiResponse.json();

  console.log(`Resultado de la API: HTTP ${apiResponse.status}`);
  console.log(apiResult);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
