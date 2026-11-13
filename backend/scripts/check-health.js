const url = process.env.API_URL || "http://localhost:3000";

async function main() {
  const response = await fetch(`${url}/health`);
  const body = await response.json();

  if (!response.ok || body.status !== "ok") {
    throw new Error(`Health check falló: HTTP ${response.status}`);
  }

  console.log(`API OK (${url}/health)`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});