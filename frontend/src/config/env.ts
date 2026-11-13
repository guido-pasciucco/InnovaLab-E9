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
 *
 * Build release (semanas 10-11): el release bloquea http. Usar la URL https del
 * backend desplegado, o habilitar la IP del backend local en
 * res/xml/network_security_config.xml (ver GUIA_SEMANAS_10_11.md).
 */
export const ENV = {
  API_BASE_URL: 'http://10.0.2.2:3000',
  FIREBASE_WEB_API_KEY: '',
  APP_VERSION: '1.0.0-rc1',
};

export const USE_MOCK_BACKEND = ENV.FIREBASE_WEB_API_KEY.trim() === '';

/**
 * Endpoints que Frontend necesita pero Backend todavía NO implementó
 * (ver GUIA_SEMANA_8.md > "Pedidos a Backend"). Mientras estén en false,
 * la app usa datos simulados para esa parte. Cuando Backend los publique,
 * se cambia a true y listo: el cliente HTTP ya está escrito.
 */
export const ENDPOINTS_READY = {
  /** GET /api/devices — dispositivos del responsable. Publicado por Backend el 3/11. */
  listDevices: true,
  /** GET /api/devices/:id/events — actividad de un dispositivo. Publicado el 3/11. */
  deviceEvents: true,
  /** POST /api/devices/:id/events — ingesta de eventos. Publicado el 3/11. */
  ingestEvents: true,
  /**
   * GET /api/alerts y POST /api/alerts/:id/read — pendiente en Backend.
   * Mientras tanto, la app arma las alertas a partir de los eventos reales
   * (src/services/derivedAlerts.ts).
   */
  alerts: false,
  /** CRUD de la lista personalizada del responsable + lectura desde el dispositivo. */
  customList: false,
  /** PUT /api/responsible-profile/pin y verificación de PIN. */
  pin: false,
  /** DELETE /api/devices/:id (desvincular). */
  unlink: false,
};
