import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getProjectById, getProjects } from '@/lib/services/projectService';
import { getNotes } from '@/lib/services/noteService';
import { getPaRecs } from '@/lib/services/paRecService';
import { getPaTasks } from '@/lib/services/paTaskService';
import ProjectDetailPageClient from './ProjectDetailPageClient';

/** Server-fetches the project plus its tasks/records/notes so the page has content on first paint. */
export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [project, notes, allProjects, records, tasks] = await Promise.all([
    getProjectById(id, supabase),
    getNotes({ projectId: id }, supabase),
    getProjects({ status: 'all' }, supabase),
    getPaRecs(id, supabase),
    getPaTasks(id, supabase),
  ]);

  return (
    <ProjectDetailPageClient
      id={id}
      initialProject={project}
      initialAllProjects={allProjects}
      initialNotes={notes}
      initialRecords={records}
      initialTasks={tasks}
    />
  );
}
