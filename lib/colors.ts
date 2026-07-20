/**
 * Pale color palette for top-level projects, plus the intensity ramp used to
 * derive sub-project colors from their top-level ancestor. Sub-projects never
 * store their own color — see `resolveProjectColor` in `lib/projectTree.ts`.
 */

/** Pastel swatches offered when picking a top-level project's color. */
export const PALE_PROJECT_COLORS = [
  '#cfe3fb', // blue
  '#d3f0dc', // green
  '#fbdbe6', // pink
  '#faf0c7', // yellow
  '#e6dbfa', // purple
  '#fbe3d3', // orange
  '#d3f0ec', // teal
  '#fbdbdb', // red
  '#dbe0fb', // indigo
  '#e3e3e8', // gray
];

/** Used as the base color when a top-level project has none set. */
export const DEFAULT_PROJECT_COLOR = '#e3e3e8';

/** How many levels of nesting keep intensifying before the ramp flattens out. */
const MAX_INTENSITY_STEPS = 4;
/** Saturation added, in percentage points, per level of nesting. */
const SATURATION_STEP = 10;
/** Lightness removed, in percentage points, per level of nesting. */
const LIGHTNESS_STEP = 8;

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.substring(0, 2), 16) / 255;
  const g = parseInt(normalized.substring(2, 4), 16) / 255;
  const b = parseInt(normalized.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: l * 100 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  h *= 60;

  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Derives the display color for a project nested `depth` levels below its
 * top-level ancestor (0 = the top-level project itself) from that ancestor's
 * `baseColor`. Each level down raises saturation and lowers lightness, so
 * sub-projects read as a progressively stronger version of the same hue. The
 * ramp caps at `MAX_INTENSITY_STEPS` so very deep nesting doesn't wash out to
 * black or neon.
 */
export function getIntensifiedColor(baseColor: string, depth: number): string {
  if (depth <= 0) return baseColor;
  const steps = Math.min(depth, MAX_INTENSITY_STEPS);
  const { h, s, l } = hexToHsl(baseColor);
  const newS = Math.min(100, s + steps * SATURATION_STEP);
  const newL = Math.max(0, l - steps * LIGHTNESS_STEP);
  return hslToHex(h, newS, newL);
}
