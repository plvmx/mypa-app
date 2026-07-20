'use client';

import { PALE_PROJECT_COLORS } from '@/lib/colors';

/**
 * A row of pale color swatches for picking a top-level project's color.
 * Sub-projects don't get a picker — they inherit and intensify this color.
 */
export default function ColorPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Project color">
      {PALE_PROJECT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-label={`Choose color ${color}`}
          aria-pressed={value === color}
          className="h-8 w-8 rounded-full border-2"
          style={{
            background: color,
            borderColor: value === color ? 'var(--color-accent)' : 'transparent',
          }}
        />
      ))}
    </div>
  );
}
