'use client';

import { useEffect, useRef } from 'react';
import { formatTimestamp } from '@/lib/formatTimestamp';
import type { TaskStep } from '@/lib/types';

/**
 * A growable list of steps for a Task — each with its own text and a
 * Completed checkbox. Mirrors DynamicListInput's add/remove ("+"/"×")
 * behaviour: always renders at least one row, and only non-last rows can be
 * removed. Checking a step's box stamps it with the current time; unchecking
 * clears the timestamp.
 */
export default function TaskStepsInput({
  values,
  onChange,
}: {
  values: TaskStep[];
  onChange: (values: TaskStep[]) => void;
}) {
  const rows = values.length > 0 ? values : [{ text: '', completed: false, completed_at: null }];
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const shouldFocusLast = useRef(false);

  useEffect(() => {
    if (shouldFocusLast.current) {
      inputRefs.current[rows.length - 1]?.focus();
      shouldFocusLast.current = false;
    }
  }, [rows.length]);

  function handleTextChange(index: number, text: string) {
    const next = [...rows];
    next[index] = { ...next[index], text };
    onChange(next);
  }

  function handleToggleCompleted(index: number, completed: boolean) {
    const next = [...rows];
    next[index] = {
      ...next[index],
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    };
    onChange(next);
  }

  function handleAdd() {
    shouldFocusLast.current = true;
    onChange([...rows, { text: '', completed: false, completed_at: null }]);
  }

  function handleRemove(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">Steps</label>
      <div className="flex flex-col gap-2">
        {rows.map((step, index) => {
          const isLast = index === rows.length - 1;
          return (
            <div key={index} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={step.completed}
                  onChange={(e) => handleToggleCompleted(index, e.target.checked)}
                  aria-label={`Step ${index + 1} completed`}
                  className="h-5 w-5 shrink-0 accent-accent"
                />
                <input
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  value={step.text}
                  onChange={(e) => handleTextChange(index, e.target.value)}
                  placeholder="A step"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent"
                />
                {isLast ? (
                  <button
                    type="button"
                    onClick={handleAdd}
                    aria-label="Add step"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-lg text-muted hover:text-accent"
                  >
                    +
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    aria-label="Remove step"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-lg text-muted hover:text-red-500"
                  >
                    ×
                  </button>
                )}
              </div>
              {step.completed && step.completed_at && (
                <p className="pl-8 text-xs text-muted">
                  Completed {formatTimestamp(step.completed_at)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
