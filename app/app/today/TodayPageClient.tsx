'use client';

import { useState } from 'react';
import Link from 'next/link';
import PaTaskCard from '@/components/PaTaskCard';
import type { PaTask, Project } from '@/lib/types';

/** End of the calendar day containing `now`, in local time. */
function endOfDay(now: Date): Date {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** A task belongs in Today if it's not done and either its due date or its reminder has arrived. */
function isDueOrReminding(task: PaTask, cutoff: Date): boolean {
  if (task.completed) return false;
  const dueSoon = task.due_at !== null && new Date(task.due_at) <= cutoff;
  const remindingSoon = task.remind_at !== null && new Date(task.remind_at) <= cutoff;
  return dueSoon || remindingSoon;
}

function earliestRelevantTime(task: PaTask): number {
  const times = [task.due_at, task.remind_at].filter((t): t is string => t !== null).map((t) => new Date(t).getTime());
  return Math.min(...times);
}

/** Cross-project view of overdue and due-today tasks, surfaced in-app (no push/email delivery). */
export default function TodayPageClient({
  initialTasks,
  projects,
}: {
  initialTasks: PaTask[];
  projects: Project[];
}) {
  const [tasks, setTasks] = useState<PaTask[]>(initialTasks);

  const cutoff = endOfDay(new Date());
  const projectTitleById = new Map(projects.map((p) => [p.id, p.title]));
  const dueTasks = tasks
    .filter((task) => isDueOrReminding(task, cutoff))
    .sort((a, b) => earliestRelevantTime(a) - earliestRelevantTime(b));

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Today</h1>
      {dueTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted">Nothing overdue or due today. Nice work.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {dueTasks.map((task) => (
            <li key={task.id}>
              <Link
                href={`/app/projects/${task.project_id}`}
                className="mb-1 block text-xs text-muted hover:text-accent"
              >
                {projectTitleById.get(task.project_id) ?? 'Unknown project'}
              </Link>
              <PaTaskCard
                task={task}
                onDeleted={(deletedId) => setTasks((prev) => prev.filter((t) => t.id !== deletedId))}
                onUpdated={(updated) =>
                  setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
