'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import PaRecForm from '@/components/PaRecForm';

/** Create-record page for a project. */
export default function NewPaRecPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">New record</h1>
      <PaRecForm
        projectId={id}
        onSaved={(rec) => router.push(`/app/projects/${id}/records/${rec.id}`)}
        onCancel={() => router.push(`/app/projects/${id}/records`)}
      />
    </div>
  );
}
