'use client';

import { useState } from 'react';
import { deleteNote, updateNote } from '@/lib/services/noteService';
import { getErrorMessage } from '@/lib/errorUtils';
import ProjectPicker from '@/components/ProjectPicker';
import type { Note, Project } from '@/lib/types';

/**
 * Displays a single note; click to edit inline, or delete. Pass `projects`
 * to enable the "Move" action (moving to/from the unfiled inbox); omit it
 * to hide Move where the project list isn't available.
 */
export default function NoteCard({
  note,
  projects,
  onDeleted,
  onUpdated,
}: {
  note: Note;
  projects?: Project[];
  onDeleted: (id: string) => void;
  onUpdated?: (note: Note) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [reference, setReference] = useState(note.reference ?? '');
  const [body, setBody] = useState(note.body);
  const [saving, setSaving] = useState(false);

  const [showMovePicker, setShowMovePicker] = useState(false);
  const [moveError, setMoveError] = useState('');

  async function handleMove(newProjectId: string | null) {
    setShowMovePicker(false);
    setMoveError('');
    try {
      const updated = await updateNote(note.id, { project_id: newProjectId });
      onUpdated?.(updated);
    } catch (err) {
      setMoveError(getErrorMessage(err));
    }
  }

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

  function startEditing() {
    setReference(note.reference ?? '');
    setBody(note.body);
    setError('');
    setEditing(true);
  }

  async function handleSave() {
    if (!body.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateNote(note.id, { body, reference });
      onUpdated?.(updated);
      setEditing(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const created = new Date(note.created_at).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  if (editing) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Reference (optional)"
          className="mb-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <textarea
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        {error && (
          <p className="mt-2 text-sm text-red-500" role="alert">
            {error}
          </p>
        )}
        <div className="mt-3 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={saving}
            className="text-sm text-muted hover:text-accent disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !body.trim()}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <button type="button" onClick={startEditing} className="block w-full text-left">
        {note.title && <h3 className="mb-1 font-medium">{note.title}</h3>}
        {note.reference && <p className="mb-1 text-xs text-muted">{note.reference}</p>}
        <p className="whitespace-pre-wrap text-sm">{note.body}</p>
      </button>
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
          excludedIds={note.project_id ? new Set([note.project_id]) : new Set()}
          onSelect={handleMove}
          onClose={() => setShowMovePicker(false)}
          title="Move note to…"
          unfiledLabel="Inbox (unfiled)"
        />
      )}
    </div>
  );
}
