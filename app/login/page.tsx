'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@supabase/auth-helpers-react';
import { supabaseBrowser } from '@/lib/supabaseClient';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSession();               // returns session if already logged in
  const supabase = supabaseBrowser();
  const expiredLink = searchParams.get('error') === 'expired_link';

  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect logged-in users away from /login
  useEffect(() => {
    if (session && !expiredLink) router.replace('/dashboard');
  }, [session, expiredLink, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/dashboard`,
      },
    });

    setLoading(false);
    if (error) setMessage(error.message);
    else setMessage('Check your email for a login link.');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="mb-6 text-2xl font-semibold">Sign in</h1>

      <form onSubmit={handleLogin} className="w-full max-w-xs space-y-4">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="w-full rounded border p-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send magic link'}
        </button>
      </form>

      {message && <p className="mt-4 text-center text-sm">{message}</p>}
      {expiredLink && (
        <p className="mt-4 text-center text-sm text-red-600">
          This login link is invalid or has expired. Please request a new link.
        </p>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
