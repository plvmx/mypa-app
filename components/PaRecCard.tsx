'use client';

import Link from 'next/link';
import { useState } from 'react';
import { deletePaRec } from '@/lib/services/paRecService';
import { getErrorMessage } from '@/lib/errorUtils';
import type { PaRec } from '@/lib/types';

/** Summary card for a record in the records list; links to its edit page. */
export default function PaRecCard({
  record,
  onDeleted,
}: {
  record: PaRec;
  onDeleted: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    if (busy) return;
    if (!confirm('Delete this record? This cannot be undone.')) return;
    setBusy(true);
    setError('');
    try {
      await deletePaRec(record.id);
      onDeleted(record.id);
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  }

  const created = new Date(record.created_at).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const meta = [record.event, record.site].filter(Boolean).join(' · ');

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Link href={`/app/projects/${record.project_id}/records/${record.id}`} className="block">
        <h3 className="font-medium">{record.title}</h3>
        {meta && <p className="text-sm text-muted">{meta}</p>}
        {record.key_learnings && (
          <p className="mt-1 line-clamp-2 text-sm">{record.key_learnings}</p>
        )}
      </Link>
      <div className="mt-3 flex items-center justify-between">
        <time className="text-xs text-muted">{created}</time>
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
