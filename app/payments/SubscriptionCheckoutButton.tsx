'use client';

import { useState } from 'react';

export default function SubscriptionCheckoutButton() {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    setLoading(true);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'subscription' }),
      });
      const text = await response.text();
      let data: { error?: string; url?: string } = {};

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          // The fallback below handles a non-JSON server response.
        }
      }

      if (!response.ok) {
        alert(data.error || text || 'Payment failed to start.');
        return;
      }

      if (!data.url) {
        alert('Checkout started, but no checkout URL was returned.');
        return;
      }

      window.location.assign(data.url);
    } catch {
      alert('Could not connect to the payment service. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={startCheckout}
      disabled={loading}
      className="rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
    >
      {loading ? 'Opening...' : 'Subscribe'}
    </button>
  );
}
