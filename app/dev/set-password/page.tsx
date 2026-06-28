'use client';

import Link from 'next/link';
import { useState } from 'react';

type SetPasswordResponse = {
  ok: boolean;
  error?: string;
};

export default function DevSetPasswordPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
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

    try {
      const response = await fetch('/api/dev/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as SetPasswordResponse;

      if (!response.ok || !data.ok) {
        setMessage(data.error ?? 'Could not update password.');
        return;
      }

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
      setMessage('Password updated. You can now sign in.');
    } catch {
      setMessage('Could not connect to the development password tool.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <section className="w-full max-w-sm space-y-4">
        <h1 className="text-center text-2xl font-semibold">Set test password</h1>
        <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Development only: set a password for a test account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full rounded border p-2"
          />
          <input
            type="password"
            required
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full rounded border p-2"
          />
          <input
            type="password"
            required
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            className="w-full rounded border p-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Set Password'}
          </button>
        </form>

        {message && (
          <p
            className={`text-center text-sm ${
              success ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {message}
          </p>
        )}

        <div className="text-center">
          <Link
            href="/login"
            className="inline-block rounded border border-emerald-600 px-4 py-2 text-emerald-700 hover:bg-emerald-50"
          >
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
}
