import { supabase } from '@/lib/supabaseClient';
import type { Project, ProjectStatus } from '@/lib/types';

/**
 * CRUD for the `projects` table. All database access for projects goes through
 * this module — pages and components must not query `supabase` directly.
 *
 * `user_id` is populated by a database default (`auth.uid()`) and every row is
 * fenced off by Row-Level Security, so callers never pass a user id.
 */

const TABLE = 'projects';

/** Fields a caller may set when creating a project. */
export interface CreateProjectInput {
  title: string;
  description?: string | null;
  color?: string | null;
}

/** Fields a caller may change when updating a project. All optional. */
export interface UpdateProjectInput {
  title?: string;
  description?: string | null;
  color?: string | null;
  status?: ProjectStatus;
}

/** List projects, most-recently-updated first. Defaults to active only. */
export async function getProjects(
  options: { status?: ProjectStatus | 'all' } = {},
): Promise<Project[]> {
  const { status = 'active' } = options;
  let query = supabase
    .from(TABLE)
    .select('*')
    .order('updated_at', { ascending: false });
  if (status !== 'all') query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Project[];
}

/** Fetch a single project by id, or null if it does not exist / is not visible. */
export async function getProjectById(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Project) ?? null;
}

/** Create a project and return the inserted row. */
export async function createProject(input: CreateProjectInput): Promise<Project> {
  const title = input.title.trim();
  if (!title) throw new Error('A project needs a title');

  const { data, error } = await supabase
    .from(TABLE)
    .insert([
      {
        title,
        description: input.description?.trim() || null,
        color: input.color ?? null,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

/** Update a project and return the updated row. */
export async function updateProject(
  id: string,
  input: UpdateProjectInput,
): Promise<Project> {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new Error('A project needs a title');
    patch.title = title;
  }
  if (input.description !== undefined) patch.description = input.description?.trim() || null;
  if (input.color !== undefined) patch.color = input.color;
  if (input.status !== undefined) patch.status = input.status;

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

/** Permanently delete a project. Its notes are detached (project_id set null) by the DB. */
export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
