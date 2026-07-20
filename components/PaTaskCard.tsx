'use client';

import Link from 'next/link';
import { useState } from 'react';
import { deletePaTask } from '@/lib/services/paTaskService';
import { getErrorMessage } from '@/lib/errorUtils';
import { formatTimestamp } from '@/lib/formatTimestamp';
import type { PaTask } from '@/lib/types';

/** Summary card for a task in the tasks list; links to its edit page. */
export default function PaTaskCard({
  task,
  onDeleted,
}: {
  task: PaTask;
  onDeleted: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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

  const doneSteps = task.steps.filter((s) => s.completed).length;
  const status =
    task.completed && task.completed_at
      ? `Completed ${formatTimestamp(task.completed_at)}`
      : task.started && task.started_at
        ? `Started ${formatTimestamp(task.started_at)}`
        : 'Not started';

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Link href={`/app/projects/${task.project_id}/tasks/${task.id}`} className="block">
        <h3 className="font-medium">{task.title}</h3>
        <p className="text-sm text-muted">{status}</p>
        {task.steps.length > 0 && (
          <p className="mt-1 text-sm">
            {doneSteps}/{task.steps.length} steps done
          </p>
        )}
      </Link>
      <div className="mt-3 flex items-center justify-between">
        <time className="text-xs text-muted">{formatTimestamp(task.created_at)}</time>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="text-xs text-muted hover:text-red-500 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
