import { supabase } from '@/lib/supabaseClient';
import type { PaTask, TaskStep, TimeEntry } from '@/lib/types';

/**
 * CRUD for the `pa_tasks` table ("Tasks"). All database access for tasks
 * goes through this module. `user_id` is set by a database default
 * (`auth.uid()`) and RLS fences every row to its owner. Like records, a task
 * always belongs to a project — `project_id` is required, never null.
 *
 * `started_at`/`completed_at` are computed here rather than left to a DB
 * default, since they must reflect the moment the checkbox was toggled and
 * be cleared back to null if unchecked. Re-saving an already-checked box
 * (e.g. editing the title while started/completed stay true) preserves the
 * original timestamp rather than bumping it.
 */

const TABLE = 'pa_tasks';

/** Fields a caller may set when creating a task. */
export interface CreatePaTaskInput {
  project_id: string;
  title: string;
  steps?: TaskStep[];
  started?: boolean;
  completed?: boolean;
  due_at?: string | null;
  remind_at?: string | null;
}

/** Fields a caller may change when updating a task. All optional. */
export interface UpdatePaTaskInput {
  title?: string;
  steps?: TaskStep[];
  started?: boolean;
  completed?: boolean;
  due_at?: string | null;
  remind_at?: string | null;
}

/** Trim step text and drop steps left blank, preserving order and completion state. */
function cleanSteps(steps: TaskStep[]): TaskStep[] {
  return steps
    .map((step) => ({ ...step, text: step.text.trim() }))
    .filter((step) => step.text.length > 0);
}

/**
 * List tasks, newest first. Pass `projectId` to scope to one project, or
 * omit to fetch all of the caller's tasks (used by snapshotService).
 */
export async function getPaTasks(projectId?: string): Promise<PaTask[]> {
  let query = supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (projectId !== undefined) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as PaTask[];
}

/** Fetch a single task by id, or null if it does not exist / is not visible. */
export async function getPaTaskById(id: string): Promise<PaTask | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as PaTask) ?? null;
}

/** Create a task and return the inserted row. */
export async function createPaTask(input: CreatePaTaskInput): Promise<PaTask> {
  const title = input.title.trim();
  if (!title) throw new Error('A task needs a title');

  const started = input.started ?? false;
  const completed = input.completed ?? false;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(TABLE)
    .insert([
      {
        project_id: input.project_id,
        title,
        steps: cleanSteps(input.steps ?? []),
        started,
        started_at: started ? now : null,
        completed,
        completed_at: completed ? now : null,
        due_at: input.due_at ?? null,
        remind_at: input.remind_at ?? null,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data as PaTask;
}

/** Update a task and return the updated row. */
export async function updatePaTask(id: string, input: UpdatePaTaskInput): Promise<PaTask> {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new Error('A task needs a title');
    patch.title = title;
  }
  if (input.steps !== undefined) patch.steps = cleanSteps(input.steps);
  if (input.due_at !== undefined) patch.due_at = input.due_at;
  if (input.remind_at !== undefined) patch.remind_at = input.remind_at;

  if (input.started !== undefined || input.completed !== undefined) {
    const current = await getPaTaskById(id);
    if (!current) throw new Error('Task not found');
    const now = new Date().toISOString();

    if (input.started !== undefined) {
      patch.started = input.started;
      patch.started_at = input.started ? current.started_at ?? now : null;
    }
    if (input.completed !== undefined) {
      patch.completed = input.completed;
      patch.completed_at = input.completed ? current.completed_at ?? now : null;
    }
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as PaTask;
}

/**
 * Start a new time-tracking session on a task. Throws if a session is
 * already running — stop it first.
 */
export async function startTimer(id: string): Promise<PaTask> {
  const current = await getPaTaskById(id);
  if (!current) throw new Error('Task not found');
  if (current.time_entries.some((entry) => entry.ended_at === null)) {
    throw new Error('A timer is already running for this task');
  }

  const entries: TimeEntry[] = [
    ...current.time_entries,
    { started_at: new Date().toISOString(), ended_at: null },
  ];
  const { data, error } = await supabase
    .from(TABLE)
    .update({ time_entries: entries })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as PaTask;
}

/** Stop the currently-running time-tracking session on a task. */
export async function stopTimer(id: string): Promise<PaTask> {
  const current = await getPaTaskById(id);
  if (!current) throw new Error('Task not found');
  const openIndex = current.time_entries.findIndex((entry) => entry.ended_at === null);
  if (openIndex === -1) throw new Error('No timer is running for this task');

  const now = new Date().toISOString();
  const entries = current.time_entries.map((entry, i) =>
    i === openIndex ? { ...entry, ended_at: now } : entry,
  );
  const { data, error } = await supabase
    .from(TABLE)
    .update({ time_entries: entries })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as PaTask;
}

/** Permanently delete a task. */
export async function deletePaTask(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
