'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { deletePaTask, updatePaTask } from '@/lib/services/paTaskService';
import { getErrorMessage } from '@/lib/errorUtils';
import { formatTimestamp } from '@/lib/formatTimestamp';
import ProjectPicker from '@/components/ProjectPicker';
import type { PaTask, Project } from '@/lib/types';

/** Due-date badge color: red once overdue, amber for today, neutral otherwise. */
function dueBadge(dueAt: string, completed: boolean, now: Date): { label: string; className: string } {
  const due = new Date(dueAt);
  const isToday = due.toDateString() === now.toDateString();
  if (!completed && due.getTime() < now.getTime() && !isToday) {
    return { label: `Overdue · ${formatTimestamp(dueAt)}`, className: 'text-red-500' };
  }
  if (isToday) {
    return { label: `Due today · ${formatTimestamp(dueAt)}`, className: 'text-amber-600' };
  }
  return { label: `Due ${formatTimestamp(dueAt)}`, className: 'text-muted' };
}

/**
 * Summary card for a task in the tasks list; links to its edit page. Pass
 * `projects` to enable the "Move" action; omit it to hide Move where the
 * project list isn't available. Pass `dragHandle` (a ready-made grip button
 * with its drag listeners already attached — see SortableTaskItem) to render
 * it beside the title without this component knowing anything about drag
 * libraries.
 */
export default function PaTaskCard({
  task,
  projects,
  dragHandle,
  onDeleted,
  onUpdated,
}: {
  task: PaTask;
  projects?: Project[];
  dragHandle?: ReactNode;
  onDeleted: (id: string) => void;
  onUpdated?: (task: PaTask) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showMovePicker, setShowMovePicker] = useState(false);
  const [moveError, setMoveError] = useState('');

  async function handleDelete() {
    if (busy) return;
    if (!confirm('Delete this task? This cannot be undone.')) return;
    setBusy(true);
    setError('');
    try {
      await deletePaTask(task.id);
      onDeleted(task.id);
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  }

  async function handleMove(newProjectId: string | null) {
    setShowMovePicker(false);
    if (newProjectId === null) return;
    setMoveError('');
    try {
      const updated = await updatePaTask(task.id, { project_id: newProjectId });
      onUpdated?.(updated);
    } catch (err) {
      setMoveError(getErrorMessage(err));
    }
  }

  const openSteps = task.steps.filter((s) => !s.completed);
  const closedSteps = task.steps.filter((s) => s.completed);
  const status =
    task.completed && task.completed_at
      ? `Completed ${formatTimestamp(task.completed_at)}`
      : task.started && task.started_at
        ? `Started ${formatTimestamp(task.started_at)}`
        : 'Not started';

  const badge = task.due_at ? dueBadge(task.due_at, task.completed, new Date()) : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-2">
        {dragHandle}
        <div className="min-w-0 flex-1">
          <Link href={`/app/projects/${task.project_id}/tasks/${task.id}`} className="block">
            <h3 className="font-medium">{task.title}</h3>
            <p className="text-sm text-muted">{status}</p>
            {badge && <p className={`mt-1 text-sm ${badge.className}`}>{badge.label}</p>}
            {task.steps.length > 0 && (
              <div className="mt-1 text-sm">
                <p className="text-muted">
                  {closedSteps.length}/{task.steps.length} steps done
                </p>
                <div className="mt-1 flex flex-col gap-2">
                  {openSteps.length > 0 && (
                    <ul className="flex flex-col gap-0.5 text-muted">
                      {openSteps.map((step, i) => (
                        <li key={i} className="truncate">
                          ☐ {step.text}
                        </li>
                      ))}
                    </ul>
                  )}
                  {closedSteps.length > 0 && (
                    <ul className="flex flex-col gap-0.5 rounded-lg bg-yellow-100 p-1.5 text-muted dark:bg-yellow-900/30">
                      {closedSteps.map((step, i) => (
                        <li key={i} className="truncate line-through">
                          ☑ {step.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </Link>
          <div className="mt-3 flex items-center justify-between">
            <time className="text-xs text-muted">{formatTimestamp(task.created_at)}</time>
            <div className="flex items-center gap-3">
              {projects && (
                <button
                  type="button"
                  onClick={() => setShowMovePicker(true)}
                  className="text-xs text-muted hover:text-accent"
                >
                  Move
                </button>
              )}
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="text-xs text-muted hover:text-red-500 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
          {(error || moveError) && (
            <p className="mt-2 text-sm text-red-500" role="alert">
              {error || moveError}
            </p>
          )}
        </div>
      </div>
      {showMovePicker && projects && (
        <ProjectPicker
          projects={projects}
          excludedIds={new Set([task.project_id])}
          onSelect={handleMove}
          onClose={() => setShowMovePicker(false)}
          title="Move task to…"
        />
      )}
    </div>
  );
}
