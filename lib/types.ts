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
  /** Parent project, or null for a top-level project. */
  parent_id: string | null;
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
  /** e.g. a URL or citation the note relates to. */
  reference: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

/**
 * A Record — a structured info object attached to a Project (unlike Notes,
 * always project-scoped; there is no "inbox" record). References and Points
 * are ordered lists of free text; Images holds Supabase Storage object paths
 * (in the `pa-rec-images` bucket), not URLs — resolve to a signed URL for
 * display via `paRecService.getPaRecImageUrl`.
 */
export interface PaRec {
  id: string;
  user_id: string;
  project_id: string;
  event: string | null;
  site: string | null;
  title: string;
  references: string[];
  points: string[];
  key_learnings: string | null;
  images: string[];
  created_at: string;
  updated_at: string;
}

/** A single step within a Task. Ordered; no separate id, position is identity. */
export interface TaskStep {
  text: string;
  completed: boolean;
  /** When `completed` was last set to true; null while unchecked. */
  completed_at: string | null;
}

/**
 * A single time-tracking session on a Task. Ordered; no separate id, position
 * is identity (mirrors `TaskStep`). `ended_at` is null while that session's
 * timer is still running — only one entry per task may be open at a time.
 */
export interface TimeEntry {
  started_at: string;
  ended_at: string | null;
}

/**
 * A Task — an actionable item attached to a Project (like Records, always
 * project-scoped; there is no "inbox" task). `started`/`completed` each pair
 * with a timestamp recording when that checkbox was last checked, cleared
 * back to null if unchecked. `steps` is an ordered checklist, each with its
 * own completed flag + timestamp. `due_at`/`remind_at` are plain nullable
 * timestamps surfaced in-app (badges, the Today view) — there is no push/email
 * delivery yet. `time_entries` is an ordered list of tracked work sessions.
 */
export interface PaTask {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  steps: TaskStep[];
  started: boolean;
  started_at: string | null;
  completed: boolean;
  completed_at: string | null;
  due_at: string | null;
  remind_at: string | null;
  time_entries: TimeEntry[];
  created_at: string;
  updated_at: string;
}

/** The full row data captured inside a Snapshot. */
export interface SnapshotData {
  projects: Project[];
  notes: Note[];
  pa_recs: PaRec[];
  pa_tasks: PaTask[];
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
