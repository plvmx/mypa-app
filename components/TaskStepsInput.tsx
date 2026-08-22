'use client';

import { useEffect, useRef } from 'react';
import { toLocalInputValue, fromLocalInputValue } from '@/lib/formatTimestamp';
import ImagePicker from '@/components/ImagePicker';
import {
  uploadPaTaskStepImage,
  getPaTaskStepImageUrl,
  removePaTaskStepImage,
} from '@/lib/services/paTaskService';
import type { TaskStep } from '@/lib/types';

/**
 * A growable list of steps for a Task — each with its own text, a Completed
 * checkbox, and an image picker. Mirrors DynamicListInput's add/remove
 * ("+"/"×") behaviour: always renders at least one row, and only non-last
 * rows can be removed. Checking a step's box stamps it with the current
 * time (editable afterwards via the date input that appears beneath it, to
 * backdate it); unchecking clears the timestamp.
 *
 * Text/checkbox/add/remove edits go through `onChange` and stay local until
 * the form's Save button is pressed, like every other field. A step's images
 * are different: `onImagesChange` fires separately so the parent can persist
 * them immediately (see PaTaskForm) — an upload that already landed in
 * Storage shouldn't be lost if the page is torn down before Save.
 */
export default function TaskStepsInput({
  values,
  onChange,
  onImagesChange,
  imagesDisabled,
  imagesDisabledHint,
}: {
  values: TaskStep[];
  onChange: (values: TaskStep[]) => void;
  onImagesChange: (index: number, images: string[]) => void;
  /** Block adding new step images (e.g. a new task needs a title before one exists to attach to). Existing images can still be removed. */
  imagesDisabled?: boolean;
  /** Shown next to the button while `imagesDisabled`. */
  imagesDisabledHint?: string;
}) {
  const rows =
    values.length > 0 ? values : [{ text: '', completed: false, completed_at: null, images: [] }];
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

  function handleCompletedAtChange(index: number, value: string) {
    const next = [...rows];
    next[index] = { ...next[index], completed_at: fromLocalInputValue(value) };
    onChange(next);
  }

  function handleAdd() {
    shouldFocusLast.current = true;
    onChange([...rows, { text: '', completed: false, completed_at: null, images: [] }]);
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
              {step.completed && (
                <input
                  type="datetime-local"
                  value={toLocalInputValue(step.completed_at)}
                  onChange={(e) => handleCompletedAtChange(index, e.target.value)}
                  aria-label={`Step ${index + 1} completed at`}
                  className="ml-8 rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none focus:border-accent"
                />
              )}
              <div className="pl-8">
                <ImagePicker
                  images={step.images}
                  onChange={(images) => onImagesChange(index, images)}
                  upload={uploadPaTaskStepImage}
                  getUrl={getPaTaskStepImageUrl}
                  remove={removePaTaskStepImage}
                  label=""
                  disabled={imagesDisabled}
                  disabledHint={imagesDisabledHint}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
