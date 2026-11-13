import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Control de intentos de PIN, PERSISTIDO (semana 9).
 *
 * Bug de la v8: el bloqueo de 30 s vivía en el estado del modal, así que
 * alcanzaba con tocar "Cancelar" y volver a abrirlo para tener 3 intentos
 * nuevos. Ahora el contador y el bloqueo se guardan en el celular y
 * sobreviven a cerrar el modal o la app. Además el bloqueo crece:
 * 30 s -> 2 min -> 10 min -> 30 min.
 *
 * Esto es solo una barrera de interfaz: el límite real lo tiene que poner
 * Backend en la verificación del PIN (pedido pendiente).
 */
const KEY = '@baprotege/pinAttempts';
export const MAX_ATTEMPTS = 3;
const LOCK_STEPS_MS = [30_000, 120_000, 600_000, 1_800_000];

interface PinAttemptsState {
  failures: number;
  lockedUntil: number;
  level: number;
}

const EMPTY: PinAttemptsState = { failures: 0, lockedUntil: 0, level: 0 };

async function read(): Promise<PinAttemptsState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

async function write(s: PinAttemptsState) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

/** Milisegundos que faltan para poder volver a intentar (0 = se puede). */
export async function lockRemainingMs(): Promise<number> {
  const s = await read();
  return Math.max(0, s.lockedUntil - Date.now());
}

/** Intentos que quedan antes del próximo bloqueo. */
export async function attemptsLeft(): Promise<number> {
  const s = await read();
  return MAX_ATTEMPTS - s.failures;
}

/** Registra un PIN incorrecto. Devuelve el bloqueo aplicado (0 si todavía quedan intentos). */
export async function registerFailure(): Promise<{ lockedMs: number; attemptsLeft: number }> {
  const s = await read();
  const failures = s.failures + 1;
  if (failures < MAX_ATTEMPTS) {
    await write({ ...s, failures });
    return { lockedMs: 0, attemptsLeft: MAX_ATTEMPTS - failures };
  }
  const lockedMs = LOCK_STEPS_MS[Math.min(s.level, LOCK_STEPS_MS.length - 1)];
  await write({ failures: 0, lockedUntil: Date.now() + lockedMs, level: s.level + 1 });
  return { lockedMs, attemptsLeft: MAX_ATTEMPTS };
}

/** PIN correcto: se reinicia todo. */
export async function registerSuccess(): Promise<void> {
  await write(EMPTY);
}
