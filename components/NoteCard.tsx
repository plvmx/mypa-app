'use client';

import { useState } from 'react';
import { deleteNote } from '@/lib/services/noteService';
import { getErrorMessage } from '@/lib/errorUtils';
import type { Note } from '@/lib/types';

/** Displays a single note with a delete action. */
export default function NoteCard({
  note,
  onDeleted,
}: {
  note: Note;
  onDeleted: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await deleteNote(note.id);
      onDeleted(note.id);
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  }

  const created = new Date(note.created_at).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      {note.title && <h3 className="mb-1 font-medium">{note.title}</h3>}
      <p className="whitespace-pre-wrap text-sm">{note.body}</p>
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
