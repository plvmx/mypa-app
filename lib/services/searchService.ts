import { supabase } from '@/lib/supabaseClient';
import type { SearchResult, SearchResultType } from '@/lib/types';

/** Either the browser client or a per-request server client — both share this shape. */
type Client = typeof supabase;

/**
 * Global substring search across projects, notes, records and tasks. All of it
 * runs through the `search_everything` Postgres function (see
 * `supabase/migrations/0009_search.sql`), which is trigram-indexed for fast
 * `LIKE '%q%'` matching and RLS-scoped so it only ever returns the caller's
 * own rows.
 */

/** Optional filters narrowing a search. All independent; omit for "no filter". */
export interface SearchFilters {
  /** Restrict to these result types. Empty/omitted = all types. */
  types?: SearchResultType[];
  /** Restrict to items in these projects. Empty/omitted = all projects. */
  projectIds?: string[];
  /** When false, drop archived projects and items under them. Defaults to true. */
  includeArchived?: boolean;
  /** Inclusive lower bound on created_at (ISO string). */
  from?: string | null;
  /** Inclusive upper bound on created_at (ISO string). */
  to?: string | null;
  /** Hard cap on rows returned (server clamps to 1..500). Defaults to 100. */
  limit?: number;
}

/** True when at least one filter would meaningfully narrow the result set. */
function hasActiveFilter(filters: SearchFilters): boolean {
  return (
    (filters.types?.length ?? 0) > 0 ||
    (filters.projectIds?.length ?? 0) > 0 ||
    filters.includeArchived === false ||
    !!filters.from ||
    !!filters.to
  );
}

/**
 * Search all content. Matches `query` as a case-insensitive substring (so a
 * term is found whether it stands alone or is part of a bigger word), further
 * narrowed by `filters`. Returns hits newest-first.
 *
 * With neither a query nor any active filter there is nothing to scope to, so
 * this short-circuits to an empty list rather than dumping every row. Pass
 * `client` to run from a server component's request-scoped client.
 */
export async function searchAll(
  query: string,
  filters: SearchFilters = {},
  client: Client = supabase,
): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q && !hasActiveFilter(filters)) return [];

  const { data, error } = await client.rpc('search_everything', {
    q,
    types: filters.types && filters.types.length > 0 ? filters.types : null,
    project_ids:
      filters.projectIds && filters.projectIds.length > 0 ? filters.projectIds : null,
    include_archived: filters.includeArchived ?? true,
    from_date: filters.from ?? null,
    to_date: filters.to ?? null,
    max_results: filters.limit ?? 100,
  });
  if (error) throw error;
  return (data ?? []) as SearchResult[];
}
