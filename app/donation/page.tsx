import Link from 'next/link';
import { getStripe } from '@/lib/stripe';
import { storeStripeCheckoutSession } from '@/lib/payments/storeStripeCheckout';
import { getCheckoutConfirmationState } from '@/lib/payments/checkoutStatus';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import DonationCheckoutForm from './DonationCheckoutForm';

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
  const sb = await createServerSupabaseClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (sessionId) {
    if (!sessionId.startsWith('cs_')) {
      confirmationState = 'error';
    } else {
      try {
        const session = await getStripe().checkout.sessions.retrieve(sessionId);

        console.info('Stripe donation Checkout Session confirmation:', {
          sessionId: session.id,
          mode: session.mode,
          status: session.status,
          paymentStatus: session.payment_status,
          purpose: session.metadata?.purpose ?? session.metadata?.type,
        });

        const belongsToCurrentDonor =
          session.metadata?.type === 'donation' &&
          (!session.metadata.user_id ||
            session.metadata.user_id === (user?.id ?? ''));

        const checkoutState = getCheckoutConfirmationState(
          session.status,
          session.payment_status
        );

        if (!belongsToCurrentDonor) {
          confirmationState = 'error';
        } else if (checkoutState === 'success') {
          await storeStripeCheckoutSession(session.id);
          confirmationState = 'success';
        } else if (checkoutState === 'pending') {
          confirmationState = 'pending';
        } else {
          confirmationState = 'error';
        }
      } catch {
        console.error(
          'Stripe donation Checkout Session confirmation failed for the supplied session_id.'
        );
        confirmationState = 'error';
      }
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 bg-transparent p-4 sm:p-6">
      <div className="rounded-2xl bg-emerald-950 p-6 text-white shadow-lg shadow-emerald-950/10 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-200">Give with purpose</p>
        <h1 className="mt-2 text-3xl font-bold">Donation</h1>
        <p className="mt-2 text-sm leading-6 text-emerald-100">
          Help more children grow with the Qur’an.
        </p>
      </div>

      {confirmationState === 'success' && (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Your donation was confirmed. Thank you for your support.
        </p>
      )}
      {confirmationState === 'pending' && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Your bank donation is processing. Thank you — Stripe will confirm the
          payment shortly.
        </p>
      )}
      {confirmationState === 'error' && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          We could not confirm this donation checkout. Please try again or
          contact support.
        </p>
      )}
      {!confirmationState && (
        <DonationCheckoutForm authenticatedEmail={user?.email} />
      )}

      <div className="grid gap-3 sm:flex sm:flex-wrap">
        <Link
          href="/payments"
          className="flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-4 py-2 text-center text-sm font-medium text-white hover:bg-emerald-800"
        >
          Payment options
        </Link>
        <Link
          href="/"
          className="flex min-h-11 items-center justify-center rounded-2xl border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-white"
        >
          Return home
        </Link>
      </div>
    </main>
  );
}
