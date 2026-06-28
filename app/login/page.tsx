'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@supabase/auth-helpers-react';
import { supabaseBrowser } from '@/lib/supabaseClient';

type ProfileRole = {
  role: { code: string | null } | { code: string | null }[] | null;
};

function getRoleCode(profile: ProfileRole | null) {
  const role = Array.isArray(profile?.role) ? profile.role[0] : profile?.role;
  return role?.code ?? null;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSession();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const expiredLink = searchParams.get('error') === 'expired_link';

  const [passwordEmail, setPasswordEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState<
    'sign-in' | 'sign-up' | 'reset' | null
  >(null);

  const [magicEmail, setMagicEmail] = useState('');
  const [magicMessage, setMagicMessage] = useState<string | null>(null);
  const [magicLoading, setMagicLoading] = useState(false);

  const getPostLoginPath = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return '/dashboard';
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role:roles(code)')
      .eq('id', user.id)
      .maybeSingle<ProfileRole>();

    return getRoleCode(profile) === 'scholar' ? '/scholar/overview' : '/dashboard';
  }, [supabase]);

  const redirectAfterLogin = useCallback(async () => {
    const path = await getPostLoginPath();
    router.replace(path);
  }, [getPostLoginPath, router]);

  useEffect(() => {
    if (session && !expiredLink) {
      void redirectAfterLogin();
    }
  }, [session, expiredLink, redirectAfterLogin]);

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (passwordLoading) return;

    setPasswordLoading('sign-in');
    setPasswordMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: passwordEmail,
      password,
    });

    setPasswordLoading(null);

    if (error) {
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        setPasswordMessage(
          'Invalid email or password. If this account was created with magic link or you forgot the password, use Reset Password. For local development, you can set a password at /dev/set-password.'
        );
        return;
      }

      setPasswordMessage(error.message);
      return;
    }

    await redirectAfterLogin();
  }

  async function handleCreateAccount() {
    if (passwordLoading) return;

    if (password.length < 6) {
      setPasswordMessage('Password must be at least 6 characters.');
      return;
    }

    setPasswordLoading('sign-up');
    setPasswordMessage(null);

    const { data, error } = await supabase.auth.signUp({
      email: passwordEmail,
      password,
    });

    setPasswordLoading(null);

    if (error) {
      const message = error.message.toLowerCase();
      if (message.includes('already registered') || message.includes('already exists')) {
        setPasswordMessage(
          'This email already exists. Use Sign In if you know the password, or Reset Password to create a new password.'
        );
        return;
      }

      setPasswordMessage(error.message);
      return;
    }

    if (data.session) {
      await redirectAfterLogin();
      return;
    }

    setPasswordMessage(
      'Account created. Please check your email to confirm your account, then sign in.'
    );
  }

  async function handleResetPassword() {
    if (passwordLoading) return;

    if (!passwordEmail) {
      setPasswordMessage('Enter your email first.');
      return;
    }

    setPasswordLoading('reset');
    setPasswordMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(passwordEmail, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    setPasswordLoading(null);

    if (error) {
      setPasswordMessage(error.message);
      return;
    }

    setPasswordMessage(
      'Password reset email sent. Open the link and set a new password. Email reset links may expire quickly.'
    );
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (magicLoading) return;

    setMagicLoading(true);
    setMagicMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: magicEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/dashboard`,
      },
    });

    setMagicLoading(false);

    if (error) {
      setMagicMessage(error.message);
      return;
    }

    setMagicMessage('Check your email for a login link.');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <h1 className="text-center text-2xl font-semibold">Sign in</h1>

        {expiredLink && (
          <p className="rounded border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
            This login link is invalid or has expired. Please request a new link.
          </p>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Sign in with email and password</h2>
          <p className="text-sm text-gray-600">
            Scholar accounts use the same login page. Their role controls where they go
            after signing in. Email reset links may expire quickly.
          </p>
          <form onSubmit={handlePasswordSignIn} className="space-y-4">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={passwordEmail}
              onChange={(e) => setPasswordEmail(e.target.value)}
              disabled={passwordLoading !== null}
              className="w-full rounded border p-2"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={passwordLoading !== null}
              className="w-full rounded border p-2"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="submit"
                disabled={passwordLoading !== null}
                className="rounded bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {passwordLoading === 'sign-in' ? 'Signing in...' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={handleCreateAccount}
                disabled={passwordLoading !== null || !passwordEmail || !password}
                className="rounded bg-slate-700 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {passwordLoading === 'sign-up' ? 'Creating...' : 'Create Account'}
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={passwordLoading !== null}
                className="rounded border border-emerald-600 py-2 font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
              >
                {passwordLoading === 'reset' ? 'Sending...' : 'Reset Password'}
              </button>
            </div>
          </form>
          {passwordMessage && <p className="text-center text-sm">{passwordMessage}</p>}
        </section>

        <section className="space-y-4 border-t pt-6">
          <h2 className="text-lg font-semibold">Alternative: Magic link</h2>
          <p className="text-sm text-gray-600">
            Magic links expire quickly and can only be used once.
          </p>
          <form onSubmit={handleMagicLink} className="space-y-4">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={magicEmail}
              onChange={(e) => setMagicEmail(e.target.value)}
              disabled={magicLoading}
              className="w-full rounded border p-2"
            />
            <button
              type="submit"
              disabled={magicLoading}
              className="w-full rounded border border-emerald-600 py-2 font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              {magicLoading ? 'Sending...' : 'Send magic link'}
            </button>
          </form>
          {magicMessage && <p className="text-center text-sm">{magicMessage}</p>}
        </section>
      </div>
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
