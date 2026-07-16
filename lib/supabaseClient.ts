import { createBrowserClient } from '@supabase/ssr';

// Fall back to harmless placeholders when the env vars are absent so that
// builds/prerenders never crash (createBrowserClient throws on empty values).
// In production these are inlined at build time from Vercel's env; a real
// misconfiguration surfaces as an auth failure at runtime, not a build crash.
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder-anon-key';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY;

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn('Supabase environment variables are not set — see .env.local.example');
}

/**
 * Browser Supabase client.
 *
 * This is the single client used throughout the frontend and by every module
 * in `lib/services/`. It reads/writes the auth session from cookies (via
 * @supabase/ssr) so the session is shared with Server Components, Route
 * Handlers, and middleware. Row-Level Security is the enforced access boundary.
 *
 * Pages and components must NOT import this directly for CRUD — all database
 * access goes through a service in `lib/services/`.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
