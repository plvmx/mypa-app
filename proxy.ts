import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Next.js proxy (formerly "middleware") — refreshes the Supabase session on
 * every request and redirects unauthenticated users away from protected routes
 * (see PROTECTED_PREFIXES in lib/supabase/middleware.ts).
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image files. The auth
     * callback and login page are intentionally matched so the session cookie
     * is refreshed there too.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)',
  ],
};
