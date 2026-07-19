'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { getProjectById } from '@/lib/services/projectService';
import { getNotes } from '@/lib/services/noteService';
import { getErrorMessage } from '@/lib/errorUtils';
import NoteComposer from '@/components/NoteComposer';
import NoteCard from '@/components/NoteCard';
import type { Project, Note } from '@/lib/types';

/** Notes list for a project, with a capture box to add a new one. */
export default function ProjectNotesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getProjectById(id), getNotes({ projectId: id })])
      .then(([proj, projNotes]) => {
        if (!active) return;
        setProject(proj);
        setNotes(projNotes);
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
  if (error) return <p className="text-sm text-red-500">{error}</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 text-sm text-muted">
        <Link href="/app">Projects</Link>
        <span aria-hidden>›</span>
        <Link href={`/app/projects/${id}`}>{project?.title ?? 'Project'}</Link>
        <span aria-hidden>›</span>
        <span>Notes</span>
      </div>

      <h1 className="mb-4 mt-2 text-xl font-semibold tracking-tight">Notes</h1>

      <div className="mb-4">
        <NoteComposer
          projectId={id}
          onCreated={(note) => setNotes((prev) => [note, ...prev])}
        />
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-muted">No notes yet — capture your first thought above.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <li key={note.id}>
              <NoteCard
                note={note}
                onDeleted={(deletedId) =>
                  setNotes((prev) => prev.filter((n) => n.id !== deletedId))
                }
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
