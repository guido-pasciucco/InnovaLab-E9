/**
 * Normaliza lo que escribe el responsable a un dominio, con la misma regla que
 * el importador de Backend: minúsculas, sin protocolo, sin "www.", sin puerto ni ruta.
 *   "https://www.BetMaster.com/promo?x=1" -> "betmaster.com"
 * Devuelve null si no parece un dominio válido.
 */
export function normalizeDomain(input: string): string | null {
  let d = input.trim().toLowerCase();
  d = d.replace(/^[a-z][a-z0-9+.-]*:\/\//, ''); // protocolo
  d = d.split(/[/?#]/)[0]; // ruta, query, ancla
  d = d.replace(/:\d+$/, ''); // puerto
  d = d.replace(/^www\./, '').replace(/\.$/, '');
  if (d.length < 3 || d.length > 253) return null;
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)) return null;
  if (d.split('.').some((label) => label.length === 0 || label.length > 63 || label.startsWith('-') || label.endsWith('-'))) return null;
  return d;
}
