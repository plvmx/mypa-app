'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPaTaskById, deletePaTask } from '@/lib/services/paTaskService';
import { getErrorMessage } from '@/lib/errorUtils';
import PaTaskForm from '@/components/PaTaskForm';
import type { PaTask } from '@/lib/types';

/** Edit page for a single task; also offers delete. */
export default function EditPaTaskPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id, taskId } = use(params);
  const router = useRouter();

  const [task, setTask] = useState<PaTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getPaTaskById(taskId)
      .then((t) => {
        if (active) setTask(t);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [taskId]);

  async function handleDelete() {
    if (!confirm('Delete this task? This cannot be undone.')) return;
    try {
      await deletePaTask(taskId);
      router.push(`/app/projects/${id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!task) {
    return (
      <div>
        <p className="text-sm text-muted">Task not found.</p>
        <Link
          href={`/app/projects/${id}`}
          className="mt-2 inline-block text-sm text-accent underline"
        >
          Back to project
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Edit task</h1>
        <button
          type="button"
          onClick={handleDelete}
          className="text-sm text-muted hover:text-red-500"
        >
          Delete
        </button>
      </div>
      <PaTaskForm
        projectId={id}
        initial={task}
        onSaved={(t) => setTask(t)}
        onCancel={() => router.push(`/app/projects/${id}`)}
      />
    </div>
  );
}
