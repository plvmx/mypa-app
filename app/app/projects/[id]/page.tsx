'use client';

import { use, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getProjectById,
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  moveProject,
} from '@/lib/services/projectService';
import { getNotes } from '@/lib/services/noteService';
import { getPaRecs } from '@/lib/services/paRecService';
import { getErrorMessage } from '@/lib/errorUtils';
import { getAncestors, getDescendantIds } from '@/lib/projectTree';
import ProjectPicker from '@/components/ProjectPicker';
import type { Project } from '@/lib/types';

/** Project detail: breadcrumb, sub-projects, and links to records/notes. */
export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [noteCount, setNoteCount] = useState(0);
  const [recordCount, setRecordCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [subTitle, setSubTitle] = useState('');
  const [creatingSub, setCreatingSub] = useState(false);
  const [subError, setSubError] = useState('');
  const [showSubForm, setShowSubForm] = useState(false);

  const [showMovePicker, setShowMovePicker] = useState(false);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [titleError, setTitleError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      getProjectById(id),
      getNotes({ projectId: id }),
      getProjects({ status: 'all' }),
      getPaRecs(id),
    ])
      .then(([proj, projNotes, allProj, records]) => {
        if (!active) return;
        setProject(proj);
        setNoteCount(projNotes.length);
        setAllProjects(allProj);
        setRecordCount(records.length);
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

  async function handleCreateSub(e: FormEvent) {
    e.preventDefault();
    if (!subTitle.trim() || creatingSub) return;
    setCreatingSub(true);
    setSubError('');
    try {
      const sub = await createProject({ title: subTitle, parent_id: id });
      setAllProjects((prev) => [sub, ...prev]);
      setSubTitle('');
      setShowSubForm(false);
    } catch (err) {
      setSubError(getErrorMessage(err));
    } finally {
      setCreatingSub(false);
    }
  }

  function startEditingTitle() {
    if (!project) return;
    setTitleValue(project.title);
    setTitleError('');
    setEditingTitle(true);
  }

  async function handleSaveTitle() {
    if (!titleValue.trim() || savingTitle) return;
    setSavingTitle(true);
    setTitleError('');
    try {
      const updated = await updateProject(id, { title: titleValue });
      setProject(updated);
      setAllProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setEditingTitle(false);
    } catch (err) {
      setTitleError(getErrorMessage(err));
    } finally {
      setSavingTitle(false);
    }
  }

  async function handleMove(newParentId: string | null) {
    setShowMovePicker(false);
    try {
      const updated = await moveProject(id, newParentId);
      setProject(updated);
      setAllProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
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

  const ancestors = getAncestors(allProjects, id);
  const children = allProjects.filter((p) => p.parent_id === id);
  const excludedIds = getDescendantIds(allProjects, id).add(id);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 text-sm text-muted">
        <Link href="/app">Projects</Link>
        {ancestors.map((ancestor) => (
          <span key={ancestor.id} className="flex items-center gap-1">
            <span aria-hidden>›</span>
            <Link href={`/app/projects/${ancestor.id}`}>{ancestor.title}</Link>
          </span>
        ))}
      </div>

      {editingTitle ? (
        <div className="mb-4 mt-2">
          <input
            autoFocus
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xl font-semibold tracking-tight outline-none focus:border-accent"
          />
          {titleError && (
            <p className="mt-2 text-sm text-red-500" role="alert">
              {titleError}
            </p>
          )}
          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditingTitle(false)}
              disabled={savingTitle}
              className="text-sm text-muted hover:text-accent disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveTitle}
              disabled={savingTitle || !titleValue.trim()}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {savingTitle ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
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
          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              onClick={startEditingTitle}
              className="text-sm text-muted hover:text-accent"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setShowMovePicker(true)}
              className="text-sm text-muted hover:text-accent"
            >
              Move
            </button>
            <button
              type="button"
              onClick={handleDeleteProject}
              className="text-sm text-muted hover:text-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Sub-projects</h2>
          <button
            type="button"
            onClick={() => setShowSubForm((v) => !v)}
            className="text-sm text-accent"
          >
            {showSubForm ? 'Cancel' : 'New sub-project'}
          </button>
        </div>

        {showSubForm && (
          <form onSubmit={handleCreateSub} className="mb-3 rounded-2xl border border-border bg-card p-3">
            <input
              autoFocus
              value={subTitle}
              onChange={(e) => setSubTitle(e.target.value)}
              placeholder="Sub-project name"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent"
            />
            {subError && (
              <p className="mt-2 text-sm text-red-500" role="alert">
                {subError}
              </p>
            )}
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={creatingSub || !subTitle.trim()}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {creatingSub ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        )}

        {children.length > 0 && (
          <ul className="flex flex-col gap-2">
            {children.map((child) => (
              <li key={child.id}>
                <Link
                  href={`/app/projects/${child.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 active:bg-border/40"
                >
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ background: child.color ?? 'var(--color-accent)' }}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{child.title}</span>
                  <span aria-hidden className="text-muted">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Records</h2>
          <Link href={`/app/projects/${id}/records`} className="text-sm text-accent">
            {recordCount > 0 ? `View all (${recordCount})` : 'Add a record'}
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Notes</h2>
          <Link href={`/app/projects/${id}/notes`} className="text-sm text-accent">
            {noteCount > 0 ? `View all (${noteCount})` : 'Add a note'}
          </Link>
        </div>
      </div>

      {showMovePicker && (
        <ProjectPicker
          projects={allProjects}
          excludedIds={excludedIds}
          onSelect={handleMove}
          onClose={() => setShowMovePicker(false)}
        />
      )}
    </div>
  );
}
