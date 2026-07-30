'use client';

import Link from 'next/link';
import { useState } from 'react';
import { deletePaRec, updatePaRec } from '@/lib/services/paRecService';
import { getErrorMessage } from '@/lib/errorUtils';
import ProjectPicker from '@/components/ProjectPicker';
import type { PaRec, Project } from '@/lib/types';

/**
 * Summary card for a record in the records list; links to its edit page.
 * Pass `projects` to enable the "Move" action; omit it to hide Move where
 * the project list isn't available.
 */
export default function PaRecCard({
  record,
  projects,
  onDeleted,
  onUpdated,
}: {
  record: PaRec;
  projects?: Project[];
  onDeleted: (id: string) => void;
  onUpdated?: (record: PaRec) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showMovePicker, setShowMovePicker] = useState(false);
  const [moveError, setMoveError] = useState('');

  async function handleMove(newProjectId: string | null) {
    setShowMovePicker(false);
    if (newProjectId === null) return;
    setMoveError('');
    try {
      const updated = await updatePaRec(record.id, { project_id: newProjectId });
      onUpdated?.(updated);
    } catch (err) {
      setMoveError(getErrorMessage(err));
    }
  }

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
        <div className="flex items-center gap-3">
          {projects && (
            <button
              type="button"
              onClick={() => setShowMovePicker(true)}
              className="text-xs text-muted hover:text-accent"
            >
              Move
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="text-xs text-muted hover:text-red-500 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
      {(error || moveError) && (
        <p className="mt-2 text-sm text-red-500" role="alert">
          {error || moveError}
        </p>
      )}
      {showMovePicker && projects && (
        <ProjectPicker
          projects={projects}
          excludedIds={new Set([record.project_id])}
          onSelect={handleMove}
          onClose={() => setShowMovePicker(false)}
          title="Move record to…"
        />
      )}
    </div>
  );
}
