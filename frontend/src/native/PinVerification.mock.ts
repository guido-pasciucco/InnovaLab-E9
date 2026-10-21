/**
 * Simula la verificación del PIN del responsable contra el `pinHash` que
 * guarda Backend (colección `responsables`). El Frontend NUNCA debe
 * comparar el PIN localmente contra un valor conocido — siempre se lo
 * manda al backend y este responde si matchea contra el hash.
 *
 * TODO: reemplazar por una llamada real, algo como:
 *   POST /responsables/:id/verificar-pin  { pin }  -> { valido: boolean }
 */

// Mock: aceptamos "1234" como si fuera el PIN correcto del responsable logueado.
const MOCK_VALID_PIN = '1234';

export async function verifyResponsiblePin(pin: string): Promise<boolean> {
  // Simula latencia de red.
  await new Promise((resolve) => setTimeout(resolve, 400));
  return pin === MOCK_VALID_PIN;
}
