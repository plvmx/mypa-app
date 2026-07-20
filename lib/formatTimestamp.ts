/** Format an ISO timestamp for display, e.g. "Jul 20, 2026, 3:45 PM". */
export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
