'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@supabase/auth-helpers-react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { getRoleCode, type ProfileRole } from '@/lib/roles';

type AccountMode = 'sign-in' | 'create';
type SignupRole = 'parent' | 'scholar';
type LoadingAction = 'sign-in' | 'sign-up' | 'reset' | null;

type RoleId = {
  id: string;
};

function getAuthMessage(code: string | null) {
  switch (code) {
    case 'expired-reset':
      return 'This password reset link expired or was already used. Please request a new reset email and open the newest link.';
    case 'password-updated':
      return 'Password updated. Please sign in with your new password.';
    case 'account-confirmed':
      return 'Account confirmed. Please sign in to continue.';
    case 'auth-error':
      return 'That sign-in link could not be used. Please sign in with your email and password.';
    default:
      return null;
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSession();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const authMessage = searchParams.get('auth_message');
  const initialMessage = getAuthMessage(authMessage);

  const [mode, setMode] = useState<AccountMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupRole, setSignupRole] = useState<SignupRole>('parent');
  const [message, setMessage] = useState<string | null>(initialMessage);
  const [loading, setLoading] = useState<LoadingAction>(null);

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
    router.refresh();
  }, [getPostLoginPath, router]);

  useEffect(() => {
    const nextMessage = getAuthMessage(authMessage);
    if (nextMessage) {
      setMessage(nextMessage);
    }
  }, [authMessage]);

  useEffect(() => {
    if (session && authMessage !== 'password-updated') {
      void redirectAfterLogin();
    }
  }, [session, authMessage, redirectAfterLogin]);

  async function setCurrentUserRole(roleCode: SignupRole) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    const { data: role } = await supabase
      .from('roles')
      .select('id')
      .eq('code', roleCode)
      .maybeSingle<RoleId>();

    if (!role) {
      return false;
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          role_id: role.id,
          scholar_status: roleCode === 'scholar' ? 'pending' : null,
        },
        { onConflict: 'id' }
      );

    return !error;
  }

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading('sign-in');
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(null);

    if (error) {
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        setMessage(
          'Invalid email or password. Use Forgot password if you need to create a new password.'
        );
        return;
      }

      setMessage('We could not sign you in. Please check your details and try again.');
      return;
    }

    await redirectAfterLogin();
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }

    setLoading('sign-up');
    setMessage(null);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          role: signupRole,
        },
      },
    });

    if (error) {
      setLoading(null);
      const errorText = error.message.toLowerCase();
      if (errorText.includes('already registered') || errorText.includes('already exists')) {
        setMessage(
          'This email already exists. Sign in if you know the password, or use Forgot password to reset it.'
        );
        return;
      }

      setMessage('We could not create this account. Please try again.');
      return;
    }

    if (data.session) {
      await setCurrentUserRole(signupRole);
      setLoading(null);
      if (signupRole === 'scholar') {
        setMode('sign-in');
        setPassword('');
        setMessage(
          'Scholar account created. Your account will be reviewed by the platform team before you can teach.'
        );
        return;
      }
      await redirectAfterLogin();
      return;
    }

    setLoading(null);
    setMode('sign-in');
    setPassword('');
    setMessage(
      signupRole === 'scholar'
        ? 'Scholar account created. Your account will be reviewed by the platform team before you can teach.'
        : 'Account created. Please check your email to confirm your account, then sign in.'
    );
  }

  async function handleResetPassword() {
    if (loading) return;

    if (!email.trim()) {
      setMessage('Enter your email first, then click Forgot password.');
      return;
    }

    setLoading('reset');
    setMessage(null);

    // Keep recovery redirect simple. Supabase will append its auth code to this URL.
    // This URL must be allow-listed in Supabase Auth redirect URLs.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    setLoading(null);

    if (error) {
      setMessage('We could not send a reset email. Please try again in a few minutes.');
      return;
    }

    setMessage('Password reset email sent. Open the newest email from us and use the link soon.');
  }

  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-emerald-50 px-4 py-10">
      <section className="w-full max-w-4xl overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
          <div className="bg-gray-50 p-6 sm:p-8">
            <p className="text-sm font-medium text-emerald-700">Quran Tutor</p>
            <h1 className="mt-3 text-3xl font-semibold text-gray-950">Welcome back</h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-gray-600">
              Sign in to continue to your Qur&apos;an learning dashboard.
            </p>

            <div className="mt-6 grid gap-3">
              <article className="rounded-lg border border-gray-200 bg-white p-4">
                <h2 className="font-semibold text-gray-950">Parent / Student</h2>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Book classes, join live lessons, and follow child progress.
                </p>
              </article>
              <article className="rounded-lg border border-gray-200 bg-white p-4">
                <h2 className="font-semibold text-gray-950">Scholar / Ustass</h2>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Teach Live Classes, manage attendance, and update child progress.
                </p>
              </article>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mx-auto max-w-sm">
              <div className="grid grid-cols-2 rounded-lg bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('sign-in');
                    setMessage(getAuthMessage(authMessage));
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    mode === 'sign-in'
                      ? 'bg-white text-gray-950 shadow-sm'
                      : 'text-gray-600 hover:text-gray-950'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('create');
                    setMessage(null);
                  }}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    mode === 'create'
                      ? 'bg-white text-gray-950 shadow-sm'
                      : 'text-gray-600 hover:text-gray-950'
                  }`}
                >
                  Create account
                </button>
              </div>

              {message && (
                <p className="mt-5 rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                  {message}
                </p>
              )}

              {mode === 'sign-in' ? (
                <form onSubmit={handlePasswordSignIn} className="mt-5 space-y-4">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-800">Email</span>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={loading !== null}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-800">Password</span>
                    <input
                      type="password"
                      required
                      placeholder="Password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={loading !== null}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={loading !== null}
                    className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {loading === 'sign-in' ? 'Signing in...' : 'Sign in'}
                  </button>

                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={loading !== null}
                    className="w-full rounded-lg border border-emerald-600 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    {loading === 'reset' ? 'Sending...' : 'Forgot password'}
                  </button>

                  <p className="text-center text-xs leading-5 text-gray-500">
                    Scholar accounts are approved by the platform team before teaching access.
                  </p>
                </form>
              ) : (
                <form onSubmit={handleCreateAccount} className="mt-5 space-y-4">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-800">Email</span>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={loading !== null}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-800">Password</span>
                    <input
                      type="password"
                      required
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={loading !== null}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                    />
                  </label>

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium text-gray-800">I am creating a:</legend>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
                      <input
                        type="radio"
                        name="signup-role"
                        value="parent"
                        checked={signupRole === 'parent'}
                        onChange={() => setSignupRole('parent')}
                        disabled={loading !== null}
                        className="mt-1"
                      />
                      <span>
                        <span className="block font-medium text-gray-950">
                          Parent / Family account
                        </span>
                        Manage children, bookings, and subscriptions.
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
                      <input
                        type="radio"
                        name="signup-role"
                        value="scholar"
                        checked={signupRole === 'scholar'}
                        onChange={() => setSignupRole('scholar')}
                        disabled={loading !== null}
                        className="mt-1"
                      />
                      <span>
                        <span className="block font-medium text-gray-950">
                          Scholar / Ustass account
                        </span>
                        Scholar accounts are reviewed by the platform team before teaching access.
                      </span>
                    </label>
                  </fieldset>

                  <button
                    type="submit"
                    disabled={loading !== null}
                    className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {loading === 'sign-up' ? 'Creating...' : 'Create account'}
                  </button>
                </form>
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
