/** Format an ISO timestamp for display, e.g. "Jul 20, 2026, 3:45 PM". */
export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * Convert an ISO timestamp to the local "YYYY-MM-DDTHH:mm" value a
 * `<input type="datetime-local">` expects (it doesn't understand ISO's `Z`/
 * offset suffix). `null` maps to `''` so the input renders empty.
 */
export function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The inverse of `toLocalInputValue`: a datetime-local input's value back to ISO, or `null` for an empty value. */
export function fromLocalInputValue(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}
