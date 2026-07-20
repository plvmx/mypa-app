'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import NoteComposer from '@/components/NoteComposer';

/** Create-note page for a project. */
export default function NewNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">New note</h1>
        <button
          type="button"
          onClick={() => router.push(`/app/projects/${id}`)}
          className="text-sm text-muted hover:text-accent"
        >
          Cancel
        </button>
      </div>
      <NoteComposer projectId={id} onCreated={() => router.push(`/app/projects/${id}`)} />
    </div>
  );
}
