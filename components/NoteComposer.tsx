'use client';

import { useState, type FormEvent } from 'react';
import { createNote } from '@/lib/services/noteService';
import { getErrorMessage } from '@/lib/errorUtils';
import type { Note } from '@/lib/types';

/**
 * A compact capture box for a new note. On success it clears itself and calls
 * `onCreated` with the new note so the parent can prepend it to its list.
 */
export default function NoteComposer({
  projectId = null,
  onCreated,
}: {
  /** Attach new notes to this project, or null for the inbox. */
  projectId?: string | null;
  onCreated: (note: Note) => void;
}) {
  const [reference, setReference] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const note = await createNote({ body, reference, project_id: projectId });
      setReference('');
      setBody('');
      onCreated(note);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-3">
      <input
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        placeholder="Reference (optional)"
        className="mb-2 w-full bg-transparent px-1 text-sm outline-none"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Capture a thought…"
        rows={3}
        className="w-full resize-none bg-transparent px-1 text-base outline-none"
      />
      {error && (
        <p className="px-1 pb-1 text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || !body.trim()}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Add note'}
        </button>
      </div>
    </form>
  );
}
