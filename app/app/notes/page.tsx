'use client';

import { useEffect, useState } from 'react';
import { getNotes } from '@/lib/services/noteService';
import { getErrorMessage } from '@/lib/errorUtils';
import NoteComposer from '@/components/NoteComposer';
import NoteCard from '@/components/NoteCard';
import type { Note } from '@/lib/types';

/**
 * Notes inbox: every note across all projects, newest first, plus a quick
 * capture box for unfiled thoughts. A lightweight "brain dump" surface.
 */
export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getNotes()
      .then((data) => {
        if (active) setNotes(data);
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
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Notes</h1>

      <div className="mb-4">
        <NoteComposer onCreated={(note) => setNotes((prev) => [note, ...prev])} />
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted">
          No notes yet — capture a thought above. Unfiled notes live here; notes added
          inside a project appear on that project.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <li key={note.id}>
              <NoteCard
                note={note}
                onDeleted={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
