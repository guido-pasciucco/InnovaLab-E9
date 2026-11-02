/**
 * Configuración del entorno. Completar con los datos que pase Backend.
 *
 * - API_BASE_URL: dónde corre el backend Express.
 *     · Emulador de Android -> 'http://10.0.2.2:3000' (10.0.2.2 es "localhost de la PC" visto desde el emulador)
 *     · Celular físico por USB -> 'http://localhost:3000' + `adb reverse tcp:3000 tcp:3000`
 * - FIREBASE_WEB_API_KEY: la "Web API Key" del proyecto Firebase sandbox
 *   (Firebase Console > Configuración del proyecto > General). NO es la cuenta
 *   de servicio (serviceAccountKey.json): esa nunca va en la app.
 *
 * Si FIREBASE_WEB_API_KEY queda vacía, la app funciona 100 % en modo demo
 * (mocks), igual que en las semanas anteriores.
 */
export const ENV = {
  API_BASE_URL: 'http://10.0.2.2:3000',
  FIREBASE_WEB_API_KEY: '',
  APP_VERSION: '0.8.0',
};

export const USE_MOCK_BACKEND = ENV.FIREBASE_WEB_API_KEY.trim() === '';

/**
 * Endpoints que Frontend necesita pero Backend todavía NO implementó
 * (ver GUIA_SEMANA_8.md > "Pedidos a Backend"). Mientras estén en false,
 * la app usa datos simulados para esa parte. Cuando Backend los publique,
 * se cambia a true y listo: el cliente HTTP ya está escrito.
 */
export const ENDPOINTS_READY = {
  /** GET /api/devices — dispositivos del responsable con estado y último reporte. */
  listDevices: false,
  /** GET /api/devices/:id/events — actividad de un dispositivo. */
  deviceEvents: false,
  /** POST /api/devices/:id/events — ingesta de eventos (propuesta #9 de Backend). */
  ingestEvents: false,
  /** GET /api/alerts y POST /api/alerts/:id/read. */
  alerts: false,
  /** CRUD de la lista personalizada del responsable + lectura desde el dispositivo. */
  customList: false,
  /** PUT /api/responsible-profile/pin y verificación de PIN. */
  pin: false,
  /** DELETE /api/devices/:id (desvincular). */
  unlink: false,
};
