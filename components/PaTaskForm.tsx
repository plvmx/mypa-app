'use client';

import { useState, type FormEvent } from 'react';
import {
  createPaTask,
  updatePaTask,
  deletePaTask,
  savePaTaskSteps,
} from '@/lib/services/paTaskService';
import { getErrorMessage } from '@/lib/errorUtils';
import { formatTimestamp } from '@/lib/formatTimestamp';
import TaskStepsInput from '@/components/TaskStepsInput';
import type { PaTask, TaskStep } from '@/lib/types';

/** `<input type="datetime-local">` uses local "YYYY-MM-DDTHH:mm", not ISO. */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

/**
 * Create/edit form for a task. Pass `initial` to edit an existing task
 * (fields are pre-filled and saving calls `updatePaTask`); omit it to create
 * a new one under `projectId` (`createPaTask`). Checking Started/Completed
 * stamps the current time locally so it's visible immediately; the save
 * request is the source of truth for what's actually persisted.
 */
export default function PaTaskForm({
  projectId,
  initial,
  onSaved,
  onCancel,
}: {
  projectId: string;
  initial?: PaTask;
  onSaved: (task: PaTask) => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [steps, setSteps] = useState<TaskStep[]>(
    initial?.steps.length
      ? initial.steps
      : [{ text: '', completed: false, completed_at: null, images: [] }],
  );
  // Tracks the task steps' images get attached to. Starts as `initial?.id`
  // (editing); for a new task it's set as soon as the first step image
  // forces an early save (see handleStepImagesChange) — after that,
  // handleSubmit updates rather than creates.
  const [taskId, setTaskId] = useState(initial?.id);
  const [started, setStarted] = useState(initial?.started ?? false);
  const [startedAt, setStartedAt] = useState<string | null>(initial?.started_at ?? null);
  const [completed, setCompleted] = useState(initial?.completed ?? false);
  const [completedAt, setCompletedAt] = useState<string | null>(initial?.completed_at ?? null);
  const [dueAt, setDueAt] = useState(initial?.due_at ?? null);
  const [remindAt, setRemindAt] = useState(initial?.remind_at ?? null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleToggleStarted(checked: boolean) {
    setStarted(checked);
    setStartedAt(checked ? new Date().toISOString() : null);
  }

  function handleToggleCompleted(checked: boolean) {
    setCompleted(checked);
    setCompletedAt(checked ? new Date().toISOString() : null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const fields = { title, steps, started, completed, due_at: dueAt, remind_at: remindAt };
      const task = taskId
        ? await updatePaTask(taskId, fields)
        : await createPaTask({ project_id: projectId, ...fields });
      onSaved(task);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  /**
   * Attach a step's image-array change to the task right away rather than
   * waiting for Save — an upload that already landed in Storage shouldn't be
   * lost if the page gets torn down (e.g. the OS reclaiming a backgrounded
   * tab/PWA while the native camera is in the foreground) before Save is
   * pressed. For a brand-new task this creates it early, using whatever
   * fields are filled in so far; handleSubmit then updates it instead.
   */
  async function handleStepImagesChange(index: number, images: string[]) {
    const nextSteps = steps.map((step, i) => (i === index ? { ...step, images } : step));
    setSteps(nextSteps);
    setError('');
    try {
      const task = await savePaTaskSteps(taskId, nextSteps, {
        project_id: projectId,
        title,
        due_at: dueAt,
        remind_at: remindAt,
      });
      if (!taskId) setTaskId(task.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  /**
   * If adding a step image auto-created a draft task (see
   * handleStepImagesChange) and the user then cancels, remove that draft
   * instead of leaving an orphaned task behind — `initial` being unset is
   * what marks it as one created by this session rather than one being
   * edited.
   */
  async function handleCancel() {
    if (!initial && taskId) {
      try {
        await deletePaTask(taskId);
      } catch {
        // best-effort cleanup — nothing the user can act on here
      }
    }
    onCancel?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4"
    >
      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="due_at" className="mb-1 block text-sm font-medium">
            Due
          </label>
          <input
            id="due_at"
            type="datetime-local"
            value={toLocalInputValue(dueAt)}
            onChange={(e) => setDueAt(fromLocalInputValue(e.target.value))}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label htmlFor="remind_at" className="mb-1 block text-sm font-medium">
            Remind me
          </label>
          <input
            id="remind_at"
            type="datetime-local"
            value={toLocalInputValue(remindAt)}
            onChange={(e) => setRemindAt(fromLocalInputValue(e.target.value))}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={started}
              onChange={(e) => handleToggleStarted(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-accent"
            />
            Started
          </label>
          {started && startedAt && (
            <p className="mt-1 pl-7 text-xs text-muted">{formatTimestamp(startedAt)}</p>
          )}
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={completed}
              onChange={(e) => handleToggleCompleted(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-accent"
            />
            Completed
          </label>
          {completed && completedAt && (
            <p className="mt-1 pl-7 text-xs text-muted">{formatTimestamp(completedAt)}</p>
          )}
        </div>
      </div>

      <TaskStepsInput
        values={steps}
        onChange={setSteps}
        onImagesChange={handleStepImagesChange}
        imagesDisabled={!taskId && !title.trim()}
        imagesDisabledHint="Add a task title first"
      />

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        {onCancel && (
          <button type="button" onClick={handleCancel} className="text-sm text-muted">
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Create task'}
        </button>
      </div>
    </form>
  );
}
