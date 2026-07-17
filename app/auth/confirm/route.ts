import { type NextRequest, NextResponse } from 'next/server';
import { type EmailOtpType } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Magic-link callback.
 *
 * Our Supabase clients (lib/supabase/*.ts) default to the PKCE flow, so the
 * *unmodified* default "Magic Link" email template redirects here with a
 * `code` param, which we exchange for a session. If the email template is
 * ever customised to link directly with `token_hash`+`type` instead (the
 * alternative pattern Supabase's docs also describe), that is handled too.
 * On failure the user is sent back to /login.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/app';

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
