/** "23/04/2015" -> "2015-04-23" (formato que exige Backend). null si no es una fecha válida y pasada. */
export function displayDateToIso(value: string): string | null {
  const m = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m.map(Number) as unknown as number[];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return iso <= new Date().toISOString().slice(0, 10) ? iso : null;
}
