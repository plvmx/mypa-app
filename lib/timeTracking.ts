import type { TimeEntry } from '@/lib/types';

/** True while one of `entries` has no `ended_at` yet (its timer is running). */
export function isTimerRunning(entries: TimeEntry[]): boolean {
  return entries.some((entry) => entry.ended_at === null);
}

/**
 * Total tracked seconds across all sessions, including live elapsed time on
 * a currently-running entry (measured against `now`).
 */
export function getTrackedSeconds(entries: TimeEntry[], now: Date = new Date()): number {
  return entries.reduce((total, entry) => {
    const end = entry.ended_at ? new Date(entry.ended_at) : now;
    const seconds = (end.getTime() - new Date(entry.started_at).getTime()) / 1000;
    return total + Math.max(0, seconds);
  }, 0);
}

/** Format a duration in seconds as e.g. "1h 05m" or "42m" or "0m". */
export function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}
