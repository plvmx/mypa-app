import { supabase } from '@/lib/supabaseClient';
import type { PaRec } from '@/lib/types';

/** Either the browser client or a per-request server client — both share this shape. */
type Client = typeof supabase;

/**
 * CRUD for the `pa_recs` table ("Records") plus the image helpers backing
 * their `images` field. All database access for records goes through this
 * module. `user_id` is set by a database default (`auth.uid()`) and RLS
 * fences every row to its owner. Unlike notes, a record always belongs to a
 * project — `project_id` is required, never null.
 */

const TABLE = 'pa_recs';
const IMAGE_BUCKET = 'pa-rec-images';

/** Fields a caller may set when creating a record. */
export interface CreatePaRecInput {
  project_id: string;
  title: string;
  event?: string | null;
  site?: string | null;
  references?: string[];
  points?: string[];
  key_learnings?: string | null;
  images?: string[];
}

/** Fields a caller may change when updating a record. All optional. */
export interface UpdatePaRecInput {
  /** Move the record to another project. Never null — a record is always filed. */
  project_id?: string;
  title?: string;
  event?: string | null;
  site?: string | null;
  references?: string[];
  points?: string[];
  key_learnings?: string | null;
  images?: string[];
}

/** Drop blank/whitespace-only entries and trim the rest, preserving order. */
function cleanList(values: string[]): string[] {
  return values.map((v) => v.trim()).filter((v) => v.length > 0);
}

/**
 * List records, newest first. Pass `projectId` to scope to one project, or
 * omit to fetch all of the caller's records (used by snapshotService). Pass
 * `client` to query from a server component's request-scoped client instead
 * of the default browser client (e.g. for server-side prefetching).
 */
export async function getPaRecs(projectId?: string, client: Client = supabase): Promise<PaRec[]> {
  let query = client
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (projectId !== undefined) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as PaRec[];
}

/** Fetch a single record by id, or null if it does not exist / is not visible. */
export async function getPaRecById(id: string): Promise<PaRec | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as PaRec) ?? null;
}

/** Create a record and return the inserted row. */
export async function createPaRec(input: CreatePaRecInput): Promise<PaRec> {
  const title = input.title.trim();
  if (!title) throw new Error('A record needs a title');

  const { data, error } = await supabase
    .from(TABLE)
    .insert([
      {
        project_id: input.project_id,
        title,
        event: input.event?.trim() || null,
        site: input.site?.trim() || null,
        references: cleanList(input.references ?? []),
        points: cleanList(input.points ?? []),
        key_learnings: input.key_learnings?.trim() || null,
        images: input.images ?? [],
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data as PaRec;
}

/** Update a record and return the updated row. */
export async function updatePaRec(id: string, input: UpdatePaRecInput): Promise<PaRec> {
  const patch: Record<string, unknown> = {};
  if (input.project_id !== undefined) patch.project_id = input.project_id;
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new Error('A record needs a title');
    patch.title = title;
  }
  if (input.event !== undefined) patch.event = input.event?.trim() || null;
  if (input.site !== undefined) patch.site = input.site?.trim() || null;
  if (input.references !== undefined) patch.references = cleanList(input.references);
  if (input.points !== undefined) patch.points = cleanList(input.points);
  if (input.key_learnings !== undefined) patch.key_learnings = input.key_learnings?.trim() || null;
  if (input.images !== undefined) patch.images = input.images;

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as PaRec;
}

/**
 * Persist an image-array change immediately, without waiting for the rest of
 * the record's fields to be saved via the form's Save button. Uploads land in
 * Storage as soon as they finish, but on mobile the tab/PWA can be torn down
 * by the OS while the native camera/photo picker is in the foreground —
 * losing any unsaved in-memory form state before Save is ever pressed. Since
 * the upload itself has already completed by then, attaching it to the
 * record right away (rather than at Save time) is what actually survives
 * that. If the record doesn't exist yet (a still-unsaved new record), it's
 * created now using `draft`'s fields plus `images`.
 */
export async function savePaRecImages(
  existingId: string | undefined,
  images: string[],
  draft: CreatePaRecInput,
): Promise<PaRec> {
  if (existingId) return updatePaRec(existingId, { images });
  return createPaRec({ ...draft, images });
}

/** Permanently delete a record and best-effort remove its images from Storage. */
export async function deletePaRec(id: string): Promise<void> {
  const existing = await getPaRecById(id);

  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;

  if (existing && existing.images.length > 0) {
    await supabase.storage.from(IMAGE_BUCKET).remove(existing.images);
  }
}

/**
 * Upload an image for a record and return its Storage object path. Doesn't
 * attach it to a record — callers append the returned path to their local
 * `images` array and persist it via `createPaRec`/`updatePaRec`.
 */
export async function uploadPaRecImage(file: File): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be signed in to upload an image');

  const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file);
  if (error) throw error;
  return path;
}

/** Get a temporary signed URL for rendering an image by its Storage path. */
export async function getPaRecImageUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

/** Permanently delete a single image from Storage by its path. */
export async function removePaRecImage(path: string): Promise<void> {
  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove([path]);
  if (error) throw error;
}
