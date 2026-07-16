import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { UserProvider } from '@/contexts/UserContext';
import MobileLayout from '@/components/MobileLayout';

/**
 * Layout for all authenticated /app pages. Verifies the session server-side
 * (belt-and-braces with middleware), seeds the UserProvider, and wraps children
 * in the shared mobile shell.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <UserProvider initialUser={user}>
      <MobileLayout>{children}</MobileLayout>
    </UserProvider>
  );
}
