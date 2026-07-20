import { describe, it, expect } from 'vitest';
import { getTrackedSeconds, isTimerRunning, formatDuration } from '@/lib/timeTracking';
import type { TimeEntry } from '@/lib/types';

describe('isTimerRunning', () => {
  it('is false for an empty list', () => {
    expect(isTimerRunning([])).toBe(false);
  });

  it('is false when every entry has ended', () => {
    const entries: TimeEntry[] = [
      { started_at: '2026-07-20T09:00:00Z', ended_at: '2026-07-20T09:30:00Z' },
    ];
    expect(isTimerRunning(entries)).toBe(false);
  });

  it('is true when any entry has no ended_at', () => {
    const entries: TimeEntry[] = [
      { started_at: '2026-07-20T09:00:00Z', ended_at: '2026-07-20T09:30:00Z' },
      { started_at: '2026-07-20T10:00:00Z', ended_at: null },
    ];
    expect(isTimerRunning(entries)).toBe(true);
  });
});

describe('getTrackedSeconds', () => {
  it('is zero for no entries', () => {
    expect(getTrackedSeconds([])).toBe(0);
  });

  it('sums the durations of closed entries', () => {
    const entries: TimeEntry[] = [
      { started_at: '2026-07-20T09:00:00Z', ended_at: '2026-07-20T09:30:00Z' },
      { started_at: '2026-07-20T10:00:00Z', ended_at: '2026-07-20T10:15:00Z' },
    ];
    expect(getTrackedSeconds(entries)).toBe(30 * 60 + 15 * 60);
  });

  it('counts live elapsed time on a running entry against `now`', () => {
    const entries: TimeEntry[] = [{ started_at: '2026-07-20T09:00:00Z', ended_at: null }];
    const now = new Date('2026-07-20T09:10:00Z');
    expect(getTrackedSeconds(entries, now)).toBe(10 * 60);
  });

  it('mixes closed and running entries', () => {
    const entries: TimeEntry[] = [
      { started_at: '2026-07-20T09:00:00Z', ended_at: '2026-07-20T09:30:00Z' },
      { started_at: '2026-07-20T10:00:00Z', ended_at: null },
    ];
    const now = new Date('2026-07-20T10:05:00Z');
    expect(getTrackedSeconds(entries, now)).toBe(30 * 60 + 5 * 60);
  });
});

describe('formatDuration', () => {
  it('formats sub-hour durations as minutes only', () => {
    expect(formatDuration(42 * 60)).toBe('42m');
    expect(formatDuration(0)).toBe('0m');
  });

  it('formats durations over an hour as "Xh MMm"', () => {
    expect(formatDuration(65 * 60)).toBe('1h 05m');
    expect(formatDuration(2 * 3600)).toBe('2h 00m');
  });
});
