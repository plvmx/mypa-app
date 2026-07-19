import { supabase } from '@/lib/supabaseClient';
import { getProjects } from '@/lib/services/projectService';
import { getNotes } from '@/lib/services/noteService';
import { getPaRecs } from '@/lib/services/paRecService';
import type { Snapshot } from '@/lib/types';

/**
 * Manual database snapshots: capture the current projects + notes + records
 * as a single row, and restore back to one later. Restore is atomic (delete +
 * repopulate in one transaction) via the `restore_snapshot` Postgres function
 * — the JS client cannot express that as a single call, so it is delegated
 * to the DB.
 */

const TABLE = 'snapshots';

/** List snapshots, most recent first. */
export async function getSnapshots(): Promise<Snapshot[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Snapshot[];
}

/** Capture the current projects + notes + records (all statuses) into a new snapshot. */
export async function createSnapshot(label?: string): Promise<Snapshot> {
  const [projects, notes, pa_recs] = await Promise.all([
    getProjects({ status: 'all' }),
    getNotes(),
    getPaRecs(),
  ]);

  const { data, error } = await supabase
    .from(TABLE)
    .insert([{ label: label?.trim() || null, data: { projects, notes, pa_recs } }])
    .select()
    .single();
  if (error) throw error;
  return data as Snapshot;
}

/** Permanently delete a snapshot. Does not affect current data. */
export async function deleteSnapshot(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

/**
 * Restore projects + notes to the state captured in the given snapshot.
 * DESTRUCTIVE: replaces all current projects and notes for this user.
 */
export async function restoreSnapshot(id: string): Promise<void> {
  const { error } = await supabase.rpc('restore_snapshot', { snapshot_id: id });
  if (error) throw error;
}
