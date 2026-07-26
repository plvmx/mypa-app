import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getPaTasks } from '@/lib/services/paTaskService';
import { getProjects } from '@/lib/services/projectService';
import TodayPageClient from './TodayPageClient';

/** Server-fetches tasks + projects so the Today list has content on first paint. */
export default async function TodayPage() {
  const supabase = await createSupabaseServerClient();
  const [tasks, projects] = await Promise.all([
    getPaTasks(undefined, supabase),
    getProjects({ status: 'all' }, supabase),
  ]);

  return <TodayPageClient initialTasks={tasks} projects={projects} />;
}
