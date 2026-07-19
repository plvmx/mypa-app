'use client';

import { useEffect, useRef } from 'react';

/**
 * A growable list of single-line text inputs — used for a record's
 * References and Points. Always renders at least one row. Every row but the
 * last shows a remove ("×") button; the last row shows an add ("+") button
 * that appends a new empty row and focuses it.
 */
export default function DynamicListInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const rows = values.length > 0 ? values : [''];
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const shouldFocusLast = useRef(false);

  useEffect(() => {
    if (shouldFocusLast.current) {
      inputRefs.current[rows.length - 1]?.focus();
      shouldFocusLast.current = false;
    }
  }, [rows.length]);

  function handleChange(index: number, value: string) {
    const next = [...rows];
    next[index] = value;
    onChange(next);
  }

  function handleAdd() {
    shouldFocusLast.current = true;
    onChange([...rows, '']);
  }

  function handleRemove(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <div className="flex flex-col gap-2">
        {rows.map((value, index) => {
          const isLast = index === rows.length - 1;
          return (
            <div key={index} className="flex items-center gap-2">
              <input
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                value={value}
                onChange={(e) => handleChange(index, e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent"
              />
              {isLast ? (
                <button
                  type="button"
                  onClick={handleAdd}
                  aria-label={`Add ${label.toLowerCase()}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-lg text-muted hover:text-accent"
                >
                  +
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  aria-label={`Remove ${label.toLowerCase()}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-lg text-muted hover:text-red-500"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
