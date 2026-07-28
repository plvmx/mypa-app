import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getProjects } from '@/lib/services/projectService';
import SearchPageClient from './SearchPageClient';

/**
 * Global search. Prefetches the project list (all statuses) so the project
 * filter is populated on first paint; results themselves load client-side as
 * the user types.
 */
export default async function SearchPage() {
  const supabase = await createSupabaseServerClient();
  const projects = await getProjects({ status: 'all' }, supabase);

  return <SearchPageClient projects={projects} />;
}
