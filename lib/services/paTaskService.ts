import { supabase } from '@/lib/supabaseClient';
import type { PaTask, TaskStep, TimeEntry } from '@/lib/types';

/** Either the browser client or a per-request server client — both share this shape. */
type Client = typeof supabase;

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
const STEP_IMAGE_BUCKET = 'pa-task-step-images';

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
  /** Move the task to another project. Never null — a task is always filed. */
  project_id?: string;
  title?: string;
  steps?: TaskStep[];
  started?: boolean;
  completed?: boolean;
  due_at?: string | null;
  remind_at?: string | null;
}

/** Backfill `images` on rows written before that field existed. */
function normalizeStep(step: TaskStep): TaskStep {
  return { ...step, images: step.images ?? [] };
}

/** Apply row-shape normalization (e.g. missing `images`) to a fetched task. */
function normalizeTask(task: PaTask): PaTask {
  return { ...task, steps: task.steps.map(normalizeStep) };
}

/**
 * Trim step text and drop steps left both blank and imageless, preserving
 * order and completion state. A step with images but no text is kept —
 * otherwise a step created purely to hold an in-progress photo (added before
 * its caption was typed) would silently vanish along with its images.
 */
function cleanSteps(steps: TaskStep[]): TaskStep[] {
  return steps
    .map((step) => ({ ...step, text: step.text.trim(), images: step.images ?? [] }))
    .filter((step) => step.text.length > 0 || step.images.length > 0);
}

/**
 * List tasks, newest first. Pass `projectId` to scope to one project, or
 * omit to fetch all of the caller's tasks (used by snapshotService). Pass
 * `client` to query from a server component's request-scoped client instead
 * of the default browser client (e.g. for server-side prefetching).
 */
export async function getPaTasks(projectId?: string, client: Client = supabase): Promise<PaTask[]> {
  let query = client
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (projectId !== undefined) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) throw error;
  return ((data || []) as PaTask[]).map(normalizeTask);
}

/** Fetch a single task by id, or null if it does not exist / is not visible. */
export async function getPaTaskById(id: string): Promise<PaTask | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeTask(data as PaTask) : null;
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
  return normalizeTask(data as PaTask);
}

/** Update a task and return the updated row. */
export async function updatePaTask(id: string, input: UpdatePaTaskInput): Promise<PaTask> {
  const patch: Record<string, unknown> = {};
  if (input.project_id !== undefined) patch.project_id = input.project_id;
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
  return normalizeTask(data as PaTask);
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
  return normalizeTask(data as PaTask);
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
  return normalizeTask(data as PaTask);
}

/**
 * Persist a `steps` change immediately, without waiting for the rest of the
 * task's fields to be saved via the form's Save button. Uploads land in
 * Storage as soon as they finish, but on mobile the tab/PWA can be torn down
 * by the OS while the native camera/photo picker is in the foreground —
 * losing any unsaved in-memory form state before Save is ever pressed. Since
 * the upload itself has already completed by then, attaching it to the task
 * right away (rather than at Save time) is what actually survives that. If
 * the task doesn't exist yet (a still-unsaved new task), it's created now
 * using `draft`'s fields plus `steps`.
 */
export async function savePaTaskSteps(
  existingId: string | undefined,
  steps: TaskStep[],
  draft: CreatePaTaskInput,
): Promise<PaTask> {
  if (existingId) return updatePaTask(existingId, { steps });
  return createPaTask({ ...draft, steps });
}

/**
 * Upload an image for a task step and return its Storage object path.
 * Doesn't attach it to a step — callers append the returned path to that
 * step's local `images` array and persist it via `savePaTaskSteps`/`updatePaTask`.
 */
export async function uploadPaTaskStepImage(file: File): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to upload an image');

  const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from(STEP_IMAGE_BUCKET).upload(path, file);
  if (error) throw error;
  return path;
}

/** Get a temporary signed URL for rendering a task-step image by its Storage path. */
export async function getPaTaskStepImageUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(STEP_IMAGE_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

/** Permanently delete a single task-step image from Storage by its path. */
export async function removePaTaskStepImage(path: string): Promise<void> {
  const { error } = await supabase.storage.from(STEP_IMAGE_BUCKET).remove([path]);
  if (error) throw error;
}

/** Permanently delete a task and best-effort remove all its steps' images from Storage. */
export async function deletePaTask(id: string): Promise<void> {
  const existing = await getPaTaskById(id);

  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;

  const imagePaths = existing?.steps.flatMap((step) => step.images) ?? [];
  if (imagePaths.length > 0) {
    await supabase.storage.from(STEP_IMAGE_BUCKET).remove(imagePaths);
  }
}
