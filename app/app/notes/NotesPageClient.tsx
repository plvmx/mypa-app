'use client';

import { useState } from 'react';
import NoteComposer from '@/components/NoteComposer';
import NoteCard from '@/components/NoteCard';
import type { Note, Project } from '@/lib/types';

/**
 * Notes inbox: every note across all projects, newest first, plus a quick
 * capture box for unfiled thoughts. A lightweight "brain dump" surface.
 */
export default function NotesPageClient({
  initialNotes,
  projects,
}: {
  initialNotes: Note[];
  projects: Project[];
}) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Notes</h1>

      <div className="mb-4">
        <NoteComposer onCreated={(note) => setNotes((prev) => [note, ...prev])} />
      </div>

      {notes.length === 0 ? (
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
                projects={projects}
                onDeleted={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
                onUpdated={(updated) =>
                  setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
