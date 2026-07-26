'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createProject,
  updateProject,
  deleteProject,
  moveProject,
} from '@/lib/services/projectService';
import { getErrorMessage } from '@/lib/errorUtils';
import { buildProjectTree, getAncestors, getDescendantIds, resolveProjectColor } from '@/lib/projectTree';
import ProjectPicker from '@/components/ProjectPicker';
import ColorPicker from '@/components/ColorPicker';
import ProjectTree from '@/components/ProjectTree';
import NoteCard from '@/components/NoteCard';
import PaRecCard from '@/components/PaRecCard';
import PaTaskCard from '@/components/PaTaskCard';
import type { Project, Note, PaRec, PaTask } from '@/lib/types';

/** Section label with a show/hide toggle (with count) and a "new" link, used for Tasks/Records/Notes. */
function SectionHeader({
  label,
  count,
  shown,
  onToggle,
  newHref,
  newLabel,
}: {
  label: string;
  count: number;
  shown: boolean;
  onToggle: () => void;
  newHref: string;
  newLabel: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm font-semibold text-muted">{label}</span>
      {count > 0 && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={shown}
          aria-label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="flex items-center gap-1 text-muted hover:text-accent"
        >
          <span
            aria-hidden
            className={`inline-block transition-transform ${shown ? 'rotate-90' : ''}`}
          >
            ›
          </span>
          <span className="text-xs font-medium">{count}</span>
        </button>
      )}
      <Link
        href={newHref}
        aria-label={newLabel}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-base leading-none text-muted hover:text-accent"
      >
        +
      </Link>
    </div>
  );
}

/** Project detail: breadcrumb, sub-projects, and inline tasks/records/notes. */
export default function ProjectDetailPageClient({
  id,
  initialProject,
  initialAllProjects,
  initialNotes,
  initialRecords,
  initialTasks,
}: {
  id: string;
  initialProject: Project | null;
  initialAllProjects: Project[];
  initialNotes: Note[];
  initialRecords: PaRec[];
  initialTasks: PaTask[];
}) {
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(initialProject);
  const [allProjects, setAllProjects] = useState<Project[]>(initialAllProjects);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [records, setRecords] = useState<PaRec[]>(initialRecords);
  const [tasks, setTasks] = useState<PaTask[]>(initialTasks);
  const [error, setError] = useState('');

  const [subTitle, setSubTitle] = useState('');
  const [creatingSub, setCreatingSub] = useState(false);
  const [subError, setSubError] = useState('');
  const [showSubForm, setShowSubForm] = useState(false);
  const [showChildren, setShowChildren] = useState(false);
  const [showTasks, setShowTasks] = useState(true);
  const [showRecords, setShowRecords] = useState(true);
  const [showNotes, setShowNotes] = useState(true);

  const [showMovePicker, setShowMovePicker] = useState(false);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [titleError, setTitleError] = useState('');

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

  async function handleChangeColor(newColor: string) {
    try {
      const updated = await updateProject(id, { color: newColor });
      setProject(updated);
      setAllProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

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

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.due_at && !b.due_at) return 0;
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });

  const ancestors = getAncestors(allProjects, id);
  const descendantIds = getDescendantIds(allProjects, id);
  const childTree = buildProjectTree(allProjects.filter((p) => descendantIds.has(p.id)));
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
                style={{ background: resolveProjectColor(project, allProjects) }}
              />
              <span className="truncate">{project.title}</span>
              {childTree.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowChildren((v) => !v)}
                  aria-expanded={showChildren}
                  aria-label={showChildren ? 'Hide sub-projects' : 'Show sub-projects'}
                  className="flex shrink-0 items-center gap-1 text-sm font-normal text-muted hover:text-accent"
                >
                  <span
                    aria-hidden
                    className={`inline-block transition-transform ${showChildren ? 'rotate-90' : ''}`}
                  >
                    ›
                  </span>
                  <span className="text-xs font-medium">{childTree.length}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSubForm((v) => !v)}
                aria-label={showSubForm ? 'Cancel new sub-project' : 'New sub-project'}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-base font-normal leading-none text-muted hover:text-accent"
              >
                {showSubForm ? '×' : '+'}
              </button>
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

      {project.parent_id === null && (
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold text-muted">Color</h2>
          <ColorPicker value={project.color} onChange={handleChangeColor} />
        </div>
      )}

      <div className="mb-4">
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

        {childTree.length > 0 && showChildren && (
          <ProjectTree nodes={childTree} projects={allProjects} />
        )}
      </div>

      <div className="mb-2 flex items-center justify-between gap-2">
        <SectionHeader
          label="Tasks"
          count={tasks.length}
          shown={showTasks}
          onToggle={() => setShowTasks((v) => !v)}
          newHref={`/app/projects/${id}/tasks/new`}
          newLabel="New task"
        />
        <SectionHeader
          label="Records"
          count={records.length}
          shown={showRecords}
          onToggle={() => setShowRecords((v) => !v)}
          newHref={`/app/projects/${id}/records/new`}
          newLabel="New record"
        />
        <SectionHeader
          label="Notes"
          count={notes.length}
          shown={showNotes}
          onToggle={() => setShowNotes((v) => !v)}
          newHref={`/app/projects/${id}/notes/new`}
          newLabel="New note"
        />
      </div>

      {tasks.length > 0 && showTasks && (
        <ul className="mb-4 flex flex-col gap-2">
          {sortedTasks.map((task) => (
            <li key={task.id}>
              <PaTaskCard
                task={task}
                onDeleted={(deletedId) =>
                  setTasks((prev) => prev.filter((t) => t.id !== deletedId))
                }
                onUpdated={(updated) =>
                  setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
                }
              />
            </li>
          ))}
        </ul>
      )}

      {records.length > 0 && showRecords && (
        <ul className="mb-4 flex flex-col gap-2">
          {records.map((record) => (
            <li key={record.id}>
              <PaRecCard
                record={record}
                onDeleted={(deletedId) =>
                  setRecords((prev) => prev.filter((r) => r.id !== deletedId))
                }
              />
            </li>
          ))}
        </ul>
      )}

      {notes.length > 0 && showNotes && (
        <ul className="mb-4 flex flex-col gap-2">
          {notes.map((note) => (
            <li key={note.id}>
              <NoteCard
                note={note}
                onDeleted={(deletedId) => setNotes((prev) => prev.filter((n) => n.id !== deletedId))}
                onUpdated={(updated) =>
                  setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
                }
              />
            </li>
          ))}
        </ul>
      )}

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
