'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPaRecs } from '@/lib/services/paRecService';
import { getErrorMessage } from '@/lib/errorUtils';
import PaRecForm from '@/components/PaRecForm';
import type { PaRec } from '@/lib/types';

/**
 * Create-record page for a project. Event/Site default to whatever was last
 * entered for this project, since those tend to repeat across records.
 */
export default function NewPaRecPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [lastRecord, setLastRecord] = useState<PaRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getPaRecs(id)
      .then((records) => {
        if (active) setLastRecord(records[0] ?? null);
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

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">New record</h1>
      {error && (
        <p className="mb-4 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
      <PaRecForm
        projectId={id}
        defaultEvent={lastRecord?.event}
        defaultSite={lastRecord?.site}
        onSaved={() => router.push(`/app/projects/${id}`)}
        onCancel={() => router.push(`/app/projects/${id}`)}
      />
    </div>
  );
}
