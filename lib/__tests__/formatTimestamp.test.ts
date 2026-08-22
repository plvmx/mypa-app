import { describe, it, expect } from 'vitest';
import { toLocalInputValue, fromLocalInputValue } from '@/lib/formatTimestamp';

describe('toLocalInputValue', () => {
  it('returns an empty string for null', () => {
    expect(toLocalInputValue(null)).toBe('');
  });

  it('formats an ISO timestamp as local "YYYY-MM-DDTHH:mm"', () => {
    const iso = '2026-07-20T09:05:00.000Z';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    const expected = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    expect(toLocalInputValue(iso)).toBe(expected);
  });
});

describe('fromLocalInputValue', () => {
  it('returns null for an empty value', () => {
    expect(fromLocalInputValue('')).toBeNull();
  });

  it('converts a "YYYY-MM-DDTHH:mm" value to an ISO string', () => {
    const iso = fromLocalInputValue('2026-07-20T09:05');
    expect(typeof iso).toBe('string');
    expect(new Date(iso ?? '').getFullYear()).toBe(2026);
  });

  it('round-trips through toLocalInputValue', () => {
    const original = '2026-07-20T09:05:00.000Z';
    const roundTripped = fromLocalInputValue(toLocalInputValue(original));
    expect(new Date(roundTripped ?? '').getTime()).toBe(new Date(original).getTime());
  });
});
