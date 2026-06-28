'use client';

import Link from 'next/link';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';

export default function UpdatePasswordPage() {
  const supabase = supabaseBrowser();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

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
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSuccess(true);
    setPassword('');
    setConfirmPassword('');
    setMessage('Password updated successfully.');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <section className="w-full max-w-sm space-y-4">
        <h1 className="text-center text-2xl font-semibold">Update password</h1>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
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
            {loading ? 'Updating...' : 'Update Password'}
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

        {success && (
          <div className="text-center">
            <Link
              href="/login"
              className="inline-block rounded border border-emerald-600 px-4 py-2 text-emerald-700 hover:bg-emerald-50"
            >
              Back to login
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
