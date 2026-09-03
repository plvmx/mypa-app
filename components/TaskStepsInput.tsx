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

/** Grows a textarea's height to fit its content, so long step text is never clipped. */
function autoResize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

/**
 * A growable list of steps for a Task — each with its own text, a "Mark as
 * done" toggle, and an image picker. Mirrors DynamicListInput's add/remove
 * ("+"/"×") behaviour: always renders at least one row, and only non-last
 * rows can be removed. Marking a step done stamps it with the current time
 * (editable afterwards via the date input that appears beneath it, to
 * backdate it); un-marking it clears the timestamp.
 *
 * Text/completed/add/remove edits go through `onChange` and stay local until
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
  const inputRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
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
      <div className="flex flex-col gap-3">
        {rows.map((step, index) => {
          const isLast = index === rows.length - 1;
          return (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3"
            >
              <div className="flex items-center gap-2">
                <textarea
                  ref={(el) => {
                    inputRefs.current[index] = el;
                    autoResize(el);
                  }}
                  value={step.text}
                  onChange={(e) => {
                    handleTextChange(index, e.target.value);
                    autoResize(e.target);
                  }}
                  placeholder="A step"
                  rows={1}
                  className="w-full resize-none overflow-hidden rounded-xl border border-border bg-card px-3 py-2 text-base outline-none focus:border-accent"
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
              <ImagePicker
                images={step.images}
                onChange={(images) => onImagesChange(index, images)}
                upload={uploadPaTaskStepImage}
                getUrl={getPaTaskStepImageUrl}
                remove={removePaTaskStepImage}
                label=""
                disabled={imagesDisabled}
                disabledHint={imagesDisabledHint}
                leadingButton={
                  <button
                    type="button"
                    onClick={() => handleToggleCompleted(index, !step.completed)}
                    aria-pressed={step.completed}
                    className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-medium ${
                      step.completed
                        ? 'border-accent bg-accent text-white'
                        : 'border-border text-muted hover:text-accent'
                    }`}
                  >
                    {step.completed ? '✓ Done' : 'Mark as done'}
                  </button>
                }
              />
              {step.completed && (
                <input
                  type="datetime-local"
                  value={toLocalInputValue(step.completed_at)}
                  onChange={(e) => handleCompletedAtChange(index, e.target.value)}
                  aria-label={`Step ${index + 1} completed at`}
                  className="rounded-lg border border-border bg-card px-2 py-1 text-xs outline-none focus:border-accent"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
