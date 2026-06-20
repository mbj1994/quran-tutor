'use client';

import { useState } from 'react';

export default function PaymentsPage() {
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

  return (
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Payments & Donations</h1>

      <div className="rounded border p-5 space-y-3">
        <h2 className="text-xl font-medium">Family Subscription</h2>
        <p className="text-sm text-gray-600">
          Subscribe monthly to access Qur’an classes for your child.
        </p>
        <button
          onClick={() => startCheckout('subscription')}
          disabled={loading !== null}
          className="rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading === 'subscription' ? 'Opening...' : 'Subscribe'}
        </button>
      </div>

      <div className="rounded border p-5 space-y-3">
        <h2 className="text-xl font-medium">Sponsor a Learner</h2>
        <p className="text-sm text-gray-600">
          Make a donation to help diaspora children access Qur’an learning.
        </p>
        <button
          onClick={() => startCheckout('donation')}
          disabled={loading !== null}
          className="rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading === 'donation' ? 'Opening...' : 'Donate'}
        </button>
      </div>
    </main>
  );
}
