'use client';

import { useState, type FormEvent } from 'react';
import { createProject } from '@/lib/services/projectService';
import { getErrorMessage } from '@/lib/errorUtils';
import { buildProjectTree } from '@/lib/projectTree';
import ProjectTree from '@/components/ProjectTree';
import ColorPicker from '@/components/ColorPicker';
import type { Project } from '@/lib/types';

/** Home screen: your list of projects / interests, with quick creation. */
export default function ProjectsPageClient({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);

  const [title, setTitle] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || creating) return;
    setCreating(true);
    setCreateError('');
    try {
      const project = await createProject({ title, color });
      setProjects((prev) => [project, ...prev]);
      setTitle('');
      setColor(null);
      setShowForm(false);
    } catch (err) {
      setCreateError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-xl bg-accent px-3 py-1.5 text-sm font-medium text-white"
        >
          {showForm ? 'Cancel' : 'New'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-4 rounded-2xl border border-border bg-card p-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Project or interest name"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent"
          />
          <div className="mt-3">
            <ColorPicker value={color} onChange={setColor} />
          </div>
          {createError && (
            <p className="mt-2 text-sm text-red-500" role="alert">
              {createError}
            </p>
          )}
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={creating || !title.trim()}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted">
            No projects yet. Tap <span className="font-medium">New</span> to add your first
            interest or project.
          </p>
        </div>
      ) : (
        <ProjectTree nodes={buildProjectTree(projects)} projects={projects} />
      )}
    </div>
  );
}
