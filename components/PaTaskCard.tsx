'use client';

import Link from 'next/link';
import { useEffect, useState, type MouseEvent } from 'react';
import { deletePaTask, startTimer, stopTimer } from '@/lib/services/paTaskService';
import { getErrorMessage } from '@/lib/errorUtils';
import { formatTimestamp } from '@/lib/formatTimestamp';
import { getTrackedSeconds, isTimerRunning, formatDuration } from '@/lib/timeTracking';
import type { PaTask } from '@/lib/types';

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

/** Summary card for a task in the tasks list; links to its edit page. */
export default function PaTaskCard({
  task,
  onDeleted,
  onUpdated,
}: {
  task: PaTask;
  onDeleted: (id: string) => void;
  onUpdated?: (task: PaTask) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [timerBusy, setTimerBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const running = isTimerRunning(task.time_entries);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [running]);

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

  async function handleToggleTimer(e: MouseEvent) {
    e.preventDefault();
    if (timerBusy) return;
    setTimerBusy(true);
    setError('');
    try {
      const updated = running ? await stopTimer(task.id) : await startTimer(task.id);
      onUpdated?.(updated);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTimerBusy(false);
    }
  }

  const doneSteps = task.steps.filter((s) => s.completed).length;
  const status =
    task.completed && task.completed_at
      ? `Completed ${formatTimestamp(task.completed_at)}`
      : task.started && task.started_at
        ? `Started ${formatTimestamp(task.started_at)}`
        : 'Not started';

  const trackedSeconds = getTrackedSeconds(task.time_entries, now);
  const badge = task.due_at ? dueBadge(task.due_at, task.completed, now) : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Link href={`/app/projects/${task.project_id}/tasks/${task.id}`} className="block">
        <h3 className="font-medium">{task.title}</h3>
        <p className="text-sm text-muted">{status}</p>
        {badge && <p className={`mt-1 text-sm ${badge.className}`}>{badge.label}</p>}
        {task.steps.length > 0 && (
          <p className="mt-1 text-sm">
            {doneSteps}/{task.steps.length} steps done
          </p>
        )}
        {trackedSeconds > 0 && (
          <p className="mt-1 text-sm text-muted">
            {formatDuration(trackedSeconds)} tracked{running && ' · running'}
          </p>
        )}
      </Link>
      <div className="mt-3 flex items-center justify-between">
        <time className="text-xs text-muted">{formatTimestamp(task.created_at)}</time>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleTimer}
            disabled={timerBusy}
            className={`text-xs font-medium disabled:opacity-50 ${
              running ? 'text-red-500' : 'text-accent'
            }`}
          >
            {running ? 'Stop timer' : 'Start timer'}
          </button>
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
      {error && (
        <p className="mt-2 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
