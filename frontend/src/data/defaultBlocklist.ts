/**
 * Lista de RESPALDO para el modo demo o si nunca se pudo bajar la oficial.
 *
 * NO es la lista LOTBA real: la real se baja de Backend con
 * GET /api/blocklists/lotba/current (src/services/blocklistSync.ts).
 * Incluye un dominio de prueba (example.org) para el experimento E2.
 */
export const DEFAULT_BLOCKLIST_VERSION = 'mock-2026.11.0';

export const DEFAULT_BLOCKLIST: string[] = [
  'betmaster.com',
  'betmario.bet',
  'apuestassonic.com',
  // Dominio de prueba para el experimento E2: ver la guía nativa.
  // Elegido porque cualquiera puede probarlo con el navegador y ver el bloqueo.
  'example.org',
];
