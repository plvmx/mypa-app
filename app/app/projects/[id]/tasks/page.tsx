'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { getProjectById } from '@/lib/services/projectService';
import { getPaTasks } from '@/lib/services/paTaskService';
import { getErrorMessage } from '@/lib/errorUtils';
import PaTaskCard from '@/components/PaTaskCard';
import type { Project, PaTask } from '@/lib/types';

/** Tasks list for a project, with a link to create a new one. */
export default function ProjectTasksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<PaTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getProjectById(id), getPaTasks(id)])
      .then(([proj, tsks]) => {
        if (!active) return;
        setProject(proj);
        setTasks(tsks);
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
  }, [id]);

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 text-sm text-muted">
        <Link href="/app">Projects</Link>
        <span aria-hidden>›</span>
        <Link href={`/app/projects/${id}`}>{project?.title ?? 'Project'}</Link>
        <span aria-hidden>›</span>
        <span>Tasks</span>
      </div>

      <div className="mb-4 mt-2 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
        <Link
          href={`/app/projects/${id}/tasks/new`}
          className="rounded-xl bg-accent px-3 py-1.5 text-sm font-medium text-white"
        >
          New
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted">
            No tasks yet. Tap <span className="font-medium">New</span> to add your first one.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <PaTaskCard
                task={task}
                onDeleted={(deletedId) =>
                  setTasks((prev) => prev.filter((t) => t.id !== deletedId))
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
