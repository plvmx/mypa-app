/**
 * Shared domain types for the personal-assistant app.
 *
 * These mirror the Postgres tables defined in `supabase/migrations/`. Keep them
 * in sync with the schema. Timestamps are ISO strings as returned by Supabase.
 */

/** Lifecycle status for a project / interest. */
export type ProjectStatus = 'active' | 'archived';

/**
 * A Project or Interest — the top-level container everything else hangs off
 * (e.g. "AFJ", "Health", "Reading").
 */
export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  /** A hex colour (e.g. "#3b82f6") used to tint the project in the UI. */
  color: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

/**
 * A Note / Thought — free-form captured text, optionally attached to a Project.
 * A null `project_id` means the note is unfiled (an "inbox" thought).
 */
export interface Note {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

/** The full row data captured inside a Snapshot. */
export interface SnapshotData {
  projects: Project[];
  notes: Note[];
}

/**
 * A point-in-time backup of a user's projects + notes, restorable from the
 * admin panel. Created manually; never edited in place.
 */
export interface Snapshot {
  id: string;
  user_id: string;
  label: string | null;
  data: SnapshotData;
  created_at: string;
}
