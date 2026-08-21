import { describe, it, expect } from 'vitest';
import { computeReorderPosition } from '@/lib/taskOrder';

describe('computeReorderPosition', () => {
  it('returns the midpoint when dropped between two tasks', () => {
    expect(computeReorderPosition(10, 20)).toBe(15);
  });

  it('steps below the first task when dropped at the top of the list', () => {
    expect(computeReorderPosition(undefined, 20)).toBe(20 - 1000);
  });

  it('steps above the last task when dropped at the bottom of the list', () => {
    expect(computeReorderPosition(10, undefined)).toBe(10 + 1000);
  });

  it('returns 0 for the only task in an otherwise-empty list', () => {
    expect(computeReorderPosition(undefined, undefined)).toBe(0);
  });

  it('keeps halving the gap for repeated reorders into the same spot', () => {
    const first = computeReorderPosition(10, 20);
    const second = computeReorderPosition(10, first);
    expect(second).toBeGreaterThan(10);
    expect(second).toBeLessThan(first);
  });
});
