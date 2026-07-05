'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from '@supabase/auth-helpers-react';

export default function PaymentsPage() {
  const session = useSession();
  const [loading, setLoading] = useState<string | null>(null);

  async function startCheckout(type: 'subscription' | 'donation') {
    setLoading(type);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const text = await res.text();
      let data: { error?: string; url?: string } = {};

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          // Keep the raw response available for a useful error below.
        }
      }

      if (!res.ok) {
        alert(data.error || text || 'Payment failed to start.');
        return;
      }

      if (!data.url) {
        alert('Checkout started, but no checkout URL was returned.');
        return;
      }

      window.location.href = data.url;
    } catch {
      alert('Could not connect to the payment service. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-2xl space-y-6 bg-gray-50 p-6">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-950">
            Checkout
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Please log in to start or manage a family subscription for live
            Qur&apos;an classes.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 bg-gray-50 p-6">
      <h1 className="text-2xl font-semibold text-gray-950">
        Checkout
      </h1>

      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-medium text-gray-950">Family Subscription</h2>
        <p className="text-sm text-gray-600">
          Subscribe monthly to book live Qur&apos;an classes and support approved
          Scholars/Ustass.
        </p>
        <button
          onClick={() => startCheckout('subscription')}
          disabled={loading !== null}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading === 'subscription' ? 'Opening...' : 'Subscribe'}
        </button>
      </div>

      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-medium text-gray-950">Sponsor a Learner</h2>
        <p className="text-sm text-gray-600">
          Make a donation to help diaspora children access Qur&apos;an learning.
        </p>
        <button
          onClick={() => startCheckout('donation')}
          disabled={loading !== null}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading === 'donation' ? 'Opening...' : 'Donate'}
        </button>
      </div>
    </main>
  );
}
