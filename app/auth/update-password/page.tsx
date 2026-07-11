'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';

function getHashParams() {
  if (typeof window === 'undefined' || !window.location.hash) {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.hash.replace(/^#/, ''));
}

function UpdatePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    async function prepareRecoverySession() {
      const hashParams = getHashParams();
      const errorCode = searchParams.get('error_code') || hashParams.get('error_code');
      const code = searchParams.get('code') || hashParams.get('code');

      if (errorCode) {
        router.replace('/login?auth_message=expired-reset');
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          router.replace('/login?auth_message=expired-reset');
          return;
        }

        router.replace('/auth/update-password');
        setCheckingSession(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login?auth_message=expired-reset');
        return;
      }

      setCheckingSession(false);
    }

    void prepareRecoverySession();
  }, [router, searchParams, supabase]);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setMessage(null);
    setSuccess(false);

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);
      const errorText = error.message.toLowerCase();
      if (errorText.includes('same password')) {
        setMessage('Choose a new password that is different from your old password.');
        return;
      }

      setMessage('We could not update your password. Please request a new reset link.');
      return;
    }

    await supabase.auth.signOut();
    setLoading(false);
    setSuccess(true);
    setPassword('');
    setConfirmPassword('');
    setMessage('Password updated. Please sign in with your new password.');
  }

  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-emerald-50 px-4 py-10">
      <section className="w-full max-w-sm rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-center text-2xl font-semibold text-gray-950">Set a new password</h1>
        <p className="mt-2 text-center text-sm leading-6 text-gray-600">
          Choose a new password with at least 6 characters.
        </p>

        {checkingSession ? (
          <p className="mt-6 text-center text-sm text-gray-600">Checking your reset link...</p>
        ) : (
          <>
            <form onSubmit={handleUpdatePassword} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-800">New password</span>
                <input
                  type="password"
                  required
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || success}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-800">Confirm password</span>
                <input
                  type="password"
                  required
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading || success}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                />
              </label>
              <button
                type="submit"
                disabled={loading || success}
                className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>

            {message && (
              <p
                className={`mt-4 rounded-lg p-3 text-center text-sm leading-6 ${
                  success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
                }`}
              >
                {message}
              </p>
            )}

            {success && (
              <div className="mt-4 text-center">
                <Link
                  href="/login?auth_message=password-updated"
                  className="inline-block rounded-lg border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                >
                  Back to login
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={null}>
      <UpdatePasswordForm />
    </Suspense>
  );
}
