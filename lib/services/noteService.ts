import { supabase } from '@/lib/supabaseClient';
import type { Note } from '@/lib/types';

/**
 * CRUD for the `notes` table. All database access for notes goes through this
 * module. `user_id` is set by a database default (`auth.uid()`) and RLS fences
 * every row to its owner.
 */

const TABLE = 'notes';

/** Fields a caller may set when creating a note. */
export interface CreateNoteInput {
  body: string;
  title?: string | null;
  reference?: string | null;
  /** Attach to a project, or omit / null for an unfiled "inbox" thought. */
  project_id?: string | null;
}

/** Fields a caller may change when updating a note. All optional. */
export interface UpdateNoteInput {
  body?: string;
  title?: string | null;
  reference?: string | null;
  project_id?: string | null;
}

/**
 * List notes, newest first. Pass `projectId` to scope to one project, or the
 * literal `null` to fetch only unfiled notes. Omit to fetch all notes.
 */
export async function getNotes(
  options: { projectId?: string | null } = {},
): Promise<Note[]> {
  let query = supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (options.projectId === null) query = query.is('project_id', null);
  else if (options.projectId !== undefined) query = query.eq('project_id', options.projectId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Note[];
}

/** Fetch a single note by id, or null if it does not exist / is not visible. */
export async function getNoteById(id: string): Promise<Note | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Note) ?? null;
}

/** Create a note and return the inserted row. */
export async function createNote(input: CreateNoteInput): Promise<Note> {
  const body = input.body.trim();
  if (!body) throw new Error('A note needs some text');

  const { data, error } = await supabase
    .from(TABLE)
    .insert([
      {
        body,
        title: input.title?.trim() || null,
        reference: input.reference?.trim() || null,
        project_id: input.project_id ?? null,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data as Note;
}

/** Update a note and return the updated row. */
export async function updateNote(id: string, input: UpdateNoteInput): Promise<Note> {
  const patch: Record<string, unknown> = {};
  if (input.body !== undefined) {
    const body = input.body.trim();
    if (!body) throw new Error('A note needs some text');
    patch.body = body;
  }
  if (input.title !== undefined) patch.title = input.title?.trim() || null;
  if (input.reference !== undefined) patch.reference = input.reference?.trim() || null;
  if (input.project_id !== undefined) patch.project_id = input.project_id;

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Note;
}

/** Permanently delete a note. */
export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
