import { describe, it, expect } from 'vitest';
import { getIntensifiedColor, PALE_PROJECT_COLORS, DEFAULT_PROJECT_COLOR } from '@/lib/colors';

describe('getIntensifiedColor', () => {
  it('returns the base color unchanged at depth 0', () => {
    expect(getIntensifiedColor('#cfe3fb', 0)).toBe('#cfe3fb');
  });

  it('returns the base color unchanged for a negative depth', () => {
    expect(getIntensifiedColor('#cfe3fb', -1)).toBe('#cfe3fb');
  });

  it('increases saturation and lowers lightness at each level of depth', () => {
    const depth1 = getIntensifiedColor('#cfe3fb', 1);
    const depth2 = getIntensifiedColor('#cfe3fb', 2);
    expect(depth1).not.toBe('#cfe3fb');
    expect(depth2).not.toBe(depth1);
  });

  it('caps the intensity ramp so very deep nesting does not keep darkening', () => {
    const depth4 = getIntensifiedColor('#cfe3fb', 4);
    const depth10 = getIntensifiedColor('#cfe3fb', 10);
    expect(depth10).toBe(depth4);
  });

  it('preserves hue while intensifying every color in the pale palette', () => {
    for (const base of PALE_PROJECT_COLORS) {
      const intensified = getIntensifiedColor(base, 2);
      expect(intensified).toMatch(/^#[0-9a-f]{6}$/);
      expect(intensified).not.toBe(base);
    }
  });

  it('has a valid default color', () => {
    expect(DEFAULT_PROJECT_COLOR).toMatch(/^#[0-9a-f]{6}$/);
  });
});
