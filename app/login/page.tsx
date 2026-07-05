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
  const authError = searchParams.get('error');
  const authErrorCode = searchParams.get('error_code');
  const authErrorDescription = searchParams.get('error_description') ?? '';
  const expiredLink =
    authError === 'expired_link' ||
    authErrorCode === 'otp_expired' ||
    authErrorDescription.toLowerCase().includes('expired');

  const [passwordEmail, setPasswordEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState<
    'sign-in' | 'sign-up' | 'reset' | null
  >(null);

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
          'Invalid email or password. If you forgot your password, request a reset link.'
        );
        return;
      }

      setPasswordMessage('We could not sign you in. Please check your details and try again.');
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

      setPasswordMessage('We could not create this account. Please try again.');
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
      setPasswordMessage('We could not send a reset email. Please try again.');
      return;
    }

    setPasswordMessage(
      'Password reset email sent. Open the link and set a new password. Email reset links may expire quickly.'
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-emerald-50 px-4 py-10">
      <section className="w-full max-w-4xl overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1fr_1.05fr]">
          <div className="bg-gray-50 p-6 sm:p-8">
            <p className="text-sm font-medium text-emerald-700">Quran Tutor</p>
            <h1 className="mt-3 text-3xl font-semibold text-gray-950">
              Welcome back
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-gray-600">
              Sign in to continue to your Qur&apos;an learning dashboard.
            </p>

            <div className="mt-6 grid gap-3">
              <article className="rounded-xl border border-gray-200 bg-white p-4">
                <h2 className="font-semibold text-gray-950">Parent / Student</h2>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Book classes, join live lessons, and follow progress.
                </p>
              </article>
              <article className="rounded-xl border border-gray-200 bg-white p-4">
                <h2 className="font-semibold text-gray-950">Scholar / Ustass</h2>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Manage classes, attendance, and learner progress.
                </p>
              </article>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mx-auto max-w-sm space-y-5">
              <h2 className="text-xl font-semibold text-gray-950">Sign in</h2>

              {(expiredLink || authError) && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                  This sign-in link expired. Please sign in with your email and
                  password, or request a new password reset.
                </p>
              )}

              <form onSubmit={handlePasswordSignIn} className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-800">
                    Email
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={passwordEmail}
                    onChange={(e) => setPasswordEmail(e.target.value)}
                    disabled={passwordLoading !== null}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-800">
                    Password
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={passwordLoading !== null}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                  />
                </label>

                <button
                  type="submit"
                  disabled={passwordLoading !== null}
                  className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {passwordLoading === 'sign-in' ? 'Signing in...' : 'Sign in'}
                </button>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleCreateAccount}
                    disabled={
                      passwordLoading !== null || !passwordEmail || !password
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {passwordLoading === 'sign-up'
                      ? 'Creating...'
                      : 'Create account'}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={passwordLoading !== null}
                    className="rounded-lg border border-emerald-600 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    {passwordLoading === 'reset'
                      ? 'Sending...'
                      : 'Forgot password'}
                  </button>
                </div>
              </form>
              {passwordMessage && (
                <p className="rounded-lg bg-gray-50 p-3 text-center text-sm leading-6 text-gray-700">
                  {passwordMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
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
