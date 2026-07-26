import { supabase } from '@/lib/supabaseClient';
import type { Project, ProjectStatus } from '@/lib/types';

/** Either the browser client or a per-request server client — both share this shape. */
type Client = typeof supabase;

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
  /** Parent project, for a sub-project. Omit / null for a top-level project. */
  parent_id?: string | null;
}

/** Fields a caller may change when updating a project. All optional. */
export interface UpdateProjectInput {
  title?: string;
  description?: string | null;
  color?: string | null;
  status?: ProjectStatus;
}

/**
 * List projects, most-recently-updated first. Defaults to active only.
 * Pass `client` to query from a server component's request-scoped client
 * instead of the default browser client (e.g. for server-side prefetching).
 */
export async function getProjects(
  options: { status?: ProjectStatus | 'all' } = {},
  client: Client = supabase,
): Promise<Project[]> {
  const { status = 'active' } = options;
  let query = client
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
        parent_id: input.parent_id ?? null,
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

/**
 * Move a project under a new parent (or to top-level, if `newParentId` is
 * null). Rejects self-parenting and rejects moving a project into one of its
 * own descendants, which would create a cycle. This is the only way
 * `parent_id` should change — `updateProject` deliberately doesn't accept it.
 */
export async function moveProject(id: string, newParentId: string | null): Promise<Project> {
  if (newParentId === id) throw new Error('A project cannot be its own parent');

  if (newParentId !== null) {
    const projects = await getProjects({ status: 'all' });
    const parentById = new Map(projects.map((p) => [p.id, p.parent_id]));
    let cursor: string | null = newParentId;
    while (cursor !== null) {
      if (cursor === id) {
        throw new Error('Cannot move a project into one of its own sub-projects');
      }
      cursor = parentById.get(cursor) ?? null;
    }
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ parent_id: newParentId })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

/** Permanently delete a project. Its notes are detached (project_id set null) by the DB. */
export async function deleteProject(id: string): Promise<void> {
  const { data: children, error: childError } = await supabase
    .from(TABLE)
    .select('id')
    .eq('parent_id', id)
    .limit(1);
  if (childError) throw childError;
  if (children && children.length > 0) {
    throw new Error('Move or delete its sub-projects first');
  }

  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
