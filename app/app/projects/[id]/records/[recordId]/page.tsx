'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getPaRecById, deletePaRec } from '@/lib/services/paRecService';
import { getErrorMessage } from '@/lib/errorUtils';
import PaRecForm from '@/components/PaRecForm';
import type { PaRec } from '@/lib/types';

/** Edit page for a single record; also offers delete. */
export default function EditPaRecPage({
  params,
}: {
  params: Promise<{ id: string; recordId: string }>;
}) {
  const { id, recordId } = use(params);
  const router = useRouter();

  const [record, setRecord] = useState<PaRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getPaRecById(recordId)
      .then((rec) => {
        if (active) setRecord(rec);
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
  }, [recordId]);

  async function handleDelete() {
    if (!confirm('Delete this record? This cannot be undone.')) return;
    try {
      await deletePaRec(recordId);
      router.push(`/app/projects/${id}/records`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!record) {
    return (
      <div>
        <p className="text-sm text-muted">Record not found.</p>
        <Link
          href={`/app/projects/${id}/records`}
          className="mt-2 inline-block text-sm text-accent underline"
        >
          Back to records
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Edit record</h1>
        <button
          type="button"
          onClick={handleDelete}
          className="text-sm text-muted hover:text-red-500"
        >
          Delete
        </button>
      </div>
      <PaRecForm
        projectId={id}
        initial={record}
        onSaved={(rec) => setRecord(rec)}
        onCancel={() => router.push(`/app/projects/${id}/records`)}
      />
    </div>
  );
}
