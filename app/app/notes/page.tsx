import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getNotes } from '@/lib/services/noteService';
import NotesPageClient from './NotesPageClient';

/** Server-fetches the initial notes list so the page has content on first paint. */
export default async function NotesPage() {
  const supabase = await createSupabaseServerClient();
  const notes = await getNotes({}, supabase);

  return <NotesPageClient initialNotes={notes} />;
}
