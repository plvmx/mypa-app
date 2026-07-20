'use client';

import { useState, type FormEvent } from 'react';
import { createPaTask, updatePaTask } from '@/lib/services/paTaskService';
import { getErrorMessage } from '@/lib/errorUtils';
import { formatTimestamp } from '@/lib/formatTimestamp';
import TaskStepsInput from '@/components/TaskStepsInput';
import type { PaTask, TaskStep } from '@/lib/types';

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
    initial?.steps.length ? initial.steps : [{ text: '', completed: false, completed_at: null }],
  );
  const [started, setStarted] = useState(initial?.started ?? false);
  const [startedAt, setStartedAt] = useState<string | null>(initial?.started_at ?? null);
  const [completed, setCompleted] = useState(initial?.completed ?? false);
  const [completedAt, setCompletedAt] = useState<string | null>(initial?.completed_at ?? null);

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
      const fields = { title, steps, started, completed };
      const task = initial
        ? await updatePaTask(initial.id, fields)
        : await createPaTask({ project_id: projectId, ...fields });
      onSaved(task);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
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

      <TaskStepsInput values={steps} onChange={setSteps} />

      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-muted">
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
