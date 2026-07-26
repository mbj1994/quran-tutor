import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { getStripe } from '@/lib/stripe';
import { storeStripeCheckoutSession } from '@/lib/payments/storeStripeCheckout';

export const dynamic = 'force-dynamic';

type ConfirmationState = 'success' | 'pending' | 'error' | null;

type DonationPageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

export default async function DonationPage({
  searchParams,
}: DonationPageProps) {
  const { session_id: sessionId } = await searchParams;
  let confirmationState: ConfirmationState = null;

  if (sessionId) {
    if (!sessionId.startsWith('cs_')) {
      confirmationState = 'error';
    } else {
      try {
        const session = await getStripe().checkout.sessions.retrieve(sessionId);

        console.info('Stripe donation Checkout Session confirmation:', {
          sessionId: session.id,
          status: session.status,
          paymentStatus: session.payment_status,
        });

        const sb = createServerComponentClient({ cookies });
        const {
          data: { user },
        } = await sb.auth.getUser();
        const belongsToCurrentDonor =
          session.metadata?.type === 'donation' &&
          (!session.metadata.user_id ||
            session.metadata.user_id === (user?.id ?? ''));

        if (!belongsToCurrentDonor || session.status !== 'complete') {
          confirmationState = 'error';
        } else if (
          session.payment_status === 'paid' ||
          session.payment_status === 'no_payment_required'
        ) {
          await storeStripeCheckoutSession(session.id);
          confirmationState = 'success';
        } else if (session.payment_status === 'unpaid') {
          confirmationState = 'pending';
        } else {
          confirmationState = 'error';
        }
      } catch (error) {
        console.error('Stripe donation Checkout Session confirmation failed:', error);
        confirmationState = 'error';
      }
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 bg-gray-50 p-4 sm:p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-950">Donation</h1>
        <p className="text-sm leading-6 text-gray-600">
          Thank you for helping diaspora children access Qur&apos;an learning.
        </p>
      </div>

      {confirmationState === 'success' && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Your donation was confirmed. Thank you for your support.
        </p>
      )}
      {confirmationState === 'pending' && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Your bank donation is processing. Thank you — Stripe will confirm the
          payment shortly.
        </p>
      )}
      {confirmationState === 'error' && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          We could not confirm this donation checkout. Please try again or
          contact support.
        </p>
      )}
      {!confirmationState && (
        <p className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
          Start a donation from the payment checkout page.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/payments"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Back to payments
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}
