require("dotenv").config({ path: require("node:path").join(__dirname, "..", ".env") });

const mode = process.argv[2];

async function main() {
  if (mode !== "responsable" && mode !== "anonimo") {
    throw new Error("Uso: node scripts/auth-smoke-test.js responsable|anonimo");
  }

  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    throw new Error("Falta FIREBASE_WEB_API_KEY en backend/.env");
  }

  let authEndpoint;
  let authPayload;

  if (mode === "responsable") {
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
  const apiResponse = await fetch(`${apiUrl}/api/test-auth`, {
    headers: {
      Authorization: `Bearer ${authResult.idToken}`
    }
  });

  const apiResult = await apiResponse.json();

  console.log(`Resultado de la API: HTTP ${apiResponse.status}`);
  console.log(apiResult);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});