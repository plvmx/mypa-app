import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getNotes } from '@/lib/services/noteService';
import { getProjects } from '@/lib/services/projectService';
import NotesPageClient from './NotesPageClient';

/** Server-fetches the initial notes list (+ all projects, for the Move picker) so the page has content on first paint. */
export default async function NotesPage() {
  const supabase = await createSupabaseServerClient();
  const [notes, projects] = await Promise.all([
    getNotes({}, supabase),
    getProjects({ status: 'all' }, supabase),
  ]);

  return <NotesPageClient initialNotes={notes} projects={projects} />;
}
