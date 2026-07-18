'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { getProjects, createProject } from '@/lib/services/projectService';
import { getErrorMessage } from '@/lib/errorUtils';
import { buildProjectTree } from '@/lib/projectTree';
import ProjectTree from '@/components/ProjectTree';
import type { Project } from '@/lib/types';

/** Home screen: your list of projects / interests, with quick creation. */
export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let active = true;
    getProjects()
      .then((data) => {
        if (active) setProjects(data);
      })
      .catch((err) => {
        if (active) setLoadError(getErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || creating) return;
    setCreating(true);
    setCreateError('');
    try {
      const project = await createProject({ title });
      setProjects((prev) => [project, ...prev]);
      setTitle('');
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

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-red-500">{loadError}</p>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted">
            No projects yet. Tap <span className="font-medium">New</span> to add your first
            interest or project.
          </p>
        </div>
      ) : (
        <ProjectTree nodes={buildProjectTree(projects)} />
      )}
    </div>
  );
}
