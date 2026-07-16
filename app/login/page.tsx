'use client';

import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getErrorMessage } from '@/lib/errorUtils';

/**
 * Magic-link login. Enter an email, receive a one-time sign-in link. Supabase
 * emails a link back to /auth/confirm which establishes the cookie session.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus('sending');
    setError('');
    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });
      if (signInError) throw signInError;
      setStatus('sent');
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus('error');
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">MyPA</h1>
          <p className="mt-2 text-sm text-muted">Your personal assistant</p>
        </div>

        {status === 'sent' ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm">
              Check <span className="font-medium">{email.trim()}</span> for a sign-in link.
            </p>
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="mt-4 text-sm text-accent underline underline-offset-4"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6">
            <label htmlFor="email" className="block text-sm font-medium">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-accent"
            />
            {status === 'error' && (
              <p className="mt-3 text-sm text-red-500" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={status === 'sending'}
              className="mt-4 w-full rounded-xl bg-accent px-4 py-3 text-base font-medium text-white disabled:opacity-60"
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
