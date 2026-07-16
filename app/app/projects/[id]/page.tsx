'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getProjectById, deleteProject } from '@/lib/services/projectService';
import { getNotes } from '@/lib/services/noteService';
import { getErrorMessage } from '@/lib/errorUtils';
import NoteComposer from '@/components/NoteComposer';
import NoteCard from '@/components/NoteCard';
import type { Project, Note } from '@/lib/types';

/** Project detail: header, the project's notes, and a capture box. */
export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

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

  async function handleDeleteProject() {
    if (!confirm('Delete this project? Its notes will be kept but unfiled.')) return;
    try {
      await deleteProject(id);
      router.push('/app');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!project) {
    return (
      <div>
        <p className="text-sm text-muted">Project not found.</p>
        <Link href="/app" className="mt-2 inline-block text-sm text-accent underline">
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/app" className="text-sm text-muted">
        ‹ Projects
      </Link>

      <div className="mb-4 mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <span
              aria-hidden
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ background: project.color ?? 'var(--color-accent)' }}
            />
            <span className="truncate">{project.title}</span>
          </h1>
          {project.description && (
            <p className="mt-1 text-sm text-muted">{project.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleDeleteProject}
          className="shrink-0 text-sm text-muted hover:text-red-500"
        >
          Delete
        </button>
      </div>

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
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
