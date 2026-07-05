'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type SyncState = 'syncing' | 'success' | 'error';

export function PaymentSuccessClient({ sessionId }: { sessionId?: string }) {
  const [syncState, setSyncState] = useState<SyncState>(
    sessionId ? 'syncing' : 'success'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    async function syncSession() {
      try {
        const response = await fetch('/api/stripe/sync-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) {
          let apiError = 'Stripe session sync failed.';

          try {
            const data: unknown = await response.json();

            if (
              typeof data === 'object' &&
              data !== null &&
              'error' in data &&
              typeof data.error === 'string'
            ) {
              apiError = data.error;
            }
          } catch {
            apiError = response.statusText || apiError;
          }

          throw new Error(apiError);
        }

        if (!cancelled) setSyncState('success');
      } catch (error) {
        console.error('Unable to sync Stripe checkout session:', error);
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Unknown error'
          );
          setSyncState('error');
        }
      }
    }

    syncSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const message =
    syncState === 'syncing'
      ? 'Payment successful. Finalizing your payment...'
      : syncState === 'success'
        ? 'Payment recorded successfully.'
        : `Payment succeeded, but recording failed: ${
            errorMessage ?? 'Unknown error'
          }`;

  return (
    <main className="mx-auto max-w-md p-6 text-center space-y-4">
      <h1 className="text-2xl font-semibold">Payment successful</h1>
      <p>{message}</p>
      <nav className="flex flex-col gap-2">
        <Link href="/subscription" className="underline">
          View subscription
        </Link>
        <Link href="/classes" className="underline">
          Browse Classes
        </Link>
        <Link href="/" className="underline">
          Go back home
        </Link>
      </nav>
    </main>
  );
}
