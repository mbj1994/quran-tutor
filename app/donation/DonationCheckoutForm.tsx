'use client';

import { useState } from 'react';

export default function DonationCheckoutForm({
  authenticatedEmail,
}: {
  authenticatedEmail?: string;
}) {
  const [amount, setAmount] = useState('25');
  const [donorEmail, setDonorEmail] = useState(authenticatedEmail ?? '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function startDonation(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;

    const amountNumber = Number(amount);
    const amountCents = Math.round(amountNumber * 100);

    if (
      !Number.isFinite(amountNumber) ||
      amountCents < 100 ||
      amountCents > 1_000_000
    ) {
      setMessage('Enter a donation amount between $1 and $10,000.');
      return;
    }

    if (!authenticatedEmail && !donorEmail.trim()) {
      setMessage('Enter your email so Stripe can send your donation receipt.');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'donation',
          amountCents,
          donorEmail: authenticatedEmail ? undefined : donorEmail.trim(),
        }),
      });
      const data: unknown = await response.json().catch(() => null);
      const checkoutUrl =
        typeof data === 'object' &&
        data !== null &&
        'url' in data &&
        typeof data.url === 'string'
          ? data.url
          : null;

      if (!response.ok || !checkoutUrl) {
        setMessage('We could not start the donation. Please try again.');
        return;
      }

      window.location.assign(checkoutUrl);
    } catch {
      setMessage('We could not connect to the payment service. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={startDonation}
      className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm shadow-emerald-950/5"
    >
      <div>
        <h2 className="text-lg font-semibold text-gray-950">Make a Donation</h2>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          Help sponsor Qur&apos;an learning for more children.
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-800">
          Donation amount (USD)
        </span>
        <div className="flex min-h-11 items-center rounded-lg border border-gray-300 bg-white focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100">
          <span className="pl-3 text-gray-500">$</span>
          <input
            type="number"
            required
            min="1"
            max="10000"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={loading}
            className="min-h-11 w-full rounded-lg px-2 py-2 text-gray-950 outline-none disabled:opacity-50"
          />
        </div>
      </label>

      {authenticatedEmail ? (
        <p className="text-sm text-gray-600">
          Receipt email: <span className="font-medium">{authenticatedEmail}</span>
        </p>
      ) : (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-800">
            Receipt email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={donorEmail}
            onChange={(event) => setDonorEmail(event.target.value)}
            disabled={loading}
            placeholder="you@example.com"
            className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
          />
        </label>
      )}

      <button
        type="submit"
        disabled={loading}
        className="min-h-11 w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 sm:w-fit"
      >
        {loading ? 'Opening secure checkout...' : 'Continue to Donation'}
      </button>

      {message && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {message}
        </p>
      )}
    </form>
  );
}
