'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  getSnapshots,
  createSnapshot,
  deleteSnapshot,
  restoreSnapshot,
} from '@/lib/services/snapshotService';
import { getErrorMessage } from '@/lib/errorUtils';
import type { Snapshot } from '@/lib/types';

/** Admin panel: take manual database snapshots and restore back to one. */
export default function AdminPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let active = true;
    getSnapshots()
      .then((data) => {
        if (active) setSnapshots(data);
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
    if (creating) return;
    setCreating(true);
    setCreateError('');
    try {
      const snapshot = await createSnapshot(label);
      setSnapshots((prev) => [snapshot, ...prev]);
      setLabel('');
    } catch (err) {
      setCreateError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleRestore(snapshot: Snapshot) {
    const when = new Date(snapshot.created_at).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const ok = confirm(
      `Restore to "${snapshot.label || 'Untitled'}" (${when})?\n\n` +
        'This replaces ALL current projects, notes, records, and tasks with this snapshot\'s contents. ' +
        'This cannot be undone unless you take a snapshot first.',
    );
    if (!ok) return;

    setBusyId(snapshot.id);
    setActionError('');
    try {
      await restoreSnapshot(snapshot.id);
      alert('Restored. Reloading…');
      window.location.assign('/app');
    } catch (err) {
      setActionError(getErrorMessage(err));
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this snapshot? This cannot be undone.')) return;
    setBusyId(id);
    setActionError('');
    try {
      await deleteSnapshot(id);
      setSnapshots((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold tracking-tight">Admin</h1>
      <p className="mb-4 text-sm text-muted">
        Snapshots capture all your projects, notes, records, and tasks right now. Restoring
        replaces current data with a snapshot&apos;s contents.
      </p>

      <form onSubmit={handleCreate} className="mb-4 rounded-2xl border border-border bg-card p-3">
        <label htmlFor="label" className="block text-sm font-medium">
          Take a snapshot
        </label>
        <input
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={'Optional label, e.g. "Before cleanup"'}
          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-base outline-none focus:border-accent"
        />
        {createError && (
          <p className="mt-2 text-sm text-red-500" role="alert">
            {createError}
          </p>
        )}
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {creating ? 'Saving…' : 'Take snapshot'}
          </button>
        </div>
      </form>

      {actionError && (
        <p className="mb-3 text-sm text-red-500" role="alert">
          {actionError}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-red-500">{loadError}</p>
      ) : snapshots.length === 0 ? (
        <p className="text-sm text-muted">No snapshots yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {snapshots.map((snapshot) => {
            const when = new Date(snapshot.created_at).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            });
            const busy = busyId === snapshot.id;
            return (
              <li key={snapshot.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{snapshot.label || 'Untitled'}</p>
                    <p className="text-xs text-muted">
                      {when} · {snapshot.data.projects.length} project
                      {snapshot.data.projects.length === 1 ? '' : 's'}, {snapshot.data.notes.length}{' '}
                      note{snapshot.data.notes.length === 1 ? '' : 's'}, {(snapshot.data.pa_recs ?? []).length}{' '}
                      record{(snapshot.data.pa_recs ?? []).length === 1 ? '' : 's'},{' '}
                      {(snapshot.data.pa_tasks ?? []).length} task
                      {(snapshot.data.pa_tasks ?? []).length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => handleDelete(snapshot.id)}
                    disabled={busy}
                    className="text-xs text-muted hover:text-red-500 disabled:opacity-50"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRestore(snapshot)}
                    disabled={busy}
                    className="text-xs font-medium text-accent disabled:opacity-50"
                  >
                    {busy ? 'Working…' : 'Restore'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
