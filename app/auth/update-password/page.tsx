'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { getBrowserSiteOrigin } from '@/lib/siteUrl';

type RecoveryState = 'checking' | 'valid' | 'expired' | 'direct';

const EXPIRED_MESSAGE =
  'This password reset link has expired. Please request a new one.';
const DIRECT_MESSAGE =
  'Please use the reset link from your email or request a new one.';

function getHashParams() {
  if (typeof window === 'undefined' || !window.location.hash) {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.hash.replace(/^#/, ''));
}

function clearRecoveryParameters() {
  window.history.replaceState({}, '', '/auth/update-password');
}

function UpdatePasswordForm() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const recoveryStarted = useRef(false);
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (recoveryStarted.current) return;
    recoveryStarted.current = true;

    async function prepareRecoverySession() {
      const hashParams = getHashParams();
      const errorCode =
        searchParams.get('error_code') ||
        searchParams.get('error') ||
        hashParams.get('error_code') ||
        hashParams.get('error');
      const code = searchParams.get('code') || hashParams.get('code');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const recoveryType =
        searchParams.get('type') || hashParams.get('type');
      const hasRecoveryParameters = Boolean(
        code || accessToken || refreshToken || recoveryType === 'recovery'
      );

      if (errorCode) {
        setRecoveryState('expired');
        return;
      }

      if (!hasRecoveryParameters) {
        setRecoveryState('direct');
        return;
      }

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error && data.session) {
          clearRecoveryParameters();
          setRecoveryState('valid');
          return;
        }
      } else if (code) {
        // The PKCE-enabled browser helper owns URL detection and exchanges the
        // code during initialization. getSession waits for that one exchange,
        // which avoids consuming the recovery code a second time.
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!error && session) {
          clearRecoveryParameters();
          setRecoveryState('valid');
          return;
        }
      }

      setRecoveryState('expired');
    }

    void prepareRecoverySession();
  }, [searchParams, supabase]);

  async function handleUpdatePassword(event: React.FormEvent) {
    event.preventDefault();
    if (loading || recoveryState !== 'valid') return;

    setMessage(null);
    setSuccess(false);

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match. Please enter the same password twice.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);

      if (error.message.toLowerCase().includes('same password')) {
        setMessage('Choose a new password that is different from your old password.');
        return;
      }

      setRecoveryState('expired');
      setMessage(null);
      return;
    }

    await supabase.auth.signOut();
    setLoading(false);
    setSuccess(true);
    setPassword('');
    setConfirmPassword('');
    setMessage('Your password has been updated. You can now log in.');
  }

  async function handleResend(event: React.FormEvent) {
    event.preventDefault();
    if (resending || resendCooldown > 0) return;

    const email = resetEmail.trim();
    if (!email) {
      setResendMessage('Enter your email address to request a new reset link.');
      return;
    }

    setResending(true);
    setResendMessage(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getBrowserSiteOrigin()}/auth/update-password`,
    });

    setResending(false);

    if (error) {
      setResendMessage(
        'We could not send a new link right now. Please wait a few minutes and try again.'
      );
      return;
    }

    setResendCooldown(60);
    setResendMessage('If that email exists, we sent a new reset link.');
  }

  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-emerald-50 px-4 py-10">
      <section className="w-full max-w-sm rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-center text-2xl font-semibold text-gray-950">
          Set a new password
        </h1>

        {recoveryState === 'checking' && (
          <p className="mt-6 text-center text-sm text-gray-600">
            Checking your reset link...
          </p>
        )}

        {recoveryState === 'valid' && (
          <>
            <p className="mt-2 text-center text-sm leading-6 text-gray-600">
              Choose a new password with at least 6 characters.
            </p>
            <form onSubmit={handleUpdatePassword} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-800">
                  New password
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading || success}
                  className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-800">
                  Confirm password
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={loading || success}
                  className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                />
              </label>
              <button
                type="submit"
                disabled={loading || success}
                className="min-h-11 w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>

            {message && (
              <p
                className={`mt-4 rounded-lg p-3 text-center text-sm leading-6 ${
                  success
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-red-50 text-red-700'
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

        {(recoveryState === 'expired' || recoveryState === 'direct') && (
          <>
            <p className="mt-5 rounded-lg bg-amber-50 p-3 text-center text-sm leading-6 text-amber-900">
              {recoveryState === 'expired' ? EXPIRED_MESSAGE : DIRECT_MESSAGE}
            </p>
            <form onSubmit={handleResend} className="mt-5 space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-800">
                  Email
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={resetEmail}
                  onChange={(event) => setResetEmail(event.target.value)}
                  disabled={resending}
                  placeholder="you@example.com"
                  className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                />
              </label>
              <button
                type="submit"
                disabled={resending || resendCooldown > 0}
                className="min-h-11 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {resending
                  ? 'Sending...'
                  : resendCooldown > 0
                    ? `Send again in ${resendCooldown}s`
                    : 'Send a new reset link'}
              </button>
            </form>

            {resendMessage && (
              <p className="mt-4 rounded-lg bg-gray-50 p-3 text-center text-sm leading-6 text-gray-700">
                {resendMessage}
              </p>
            )}

            <div className="mt-4 text-center">
              <Link
                href="/login"
                className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
              >
                Back to login
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[55vh] items-center justify-center p-4">
          <p className="text-sm text-gray-600">Checking your reset link...</p>
        </main>
      }
    >
      <UpdatePasswordForm />
    </Suspense>
  );
}
