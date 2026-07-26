import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getProjects } from '@/lib/services/projectService';
import ProjectsPageClient from './ProjectsPageClient';

/** Server-fetches the initial project list so the page has content on first paint. */
export default async function ProjectsPage() {
  const supabase = await createSupabaseServerClient();
  const projects = await getProjects({}, supabase);

  return <ProjectsPageClient initialProjects={projects} />;
}
