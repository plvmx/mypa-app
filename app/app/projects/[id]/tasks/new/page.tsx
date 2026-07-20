'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import PaTaskForm from '@/components/PaTaskForm';

/** Create-task page for a project. */
export default function NewPaTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">New task</h1>
      <PaTaskForm
        projectId={id}
        onSaved={(task) => router.push(`/app/projects/${id}/tasks/${task.id}`)}
        onCancel={() => router.push(`/app/projects/${id}/tasks`)}
      />
    </div>
  );
}
