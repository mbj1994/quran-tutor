import Link from 'next/link';
import { getStripe } from '@/lib/stripe';
import { storeStripeCheckoutSession } from '@/lib/payments/storeStripeCheckout';
import {
  getCheckoutConfirmationState,
  type CheckoutConfirmationState,
} from '@/lib/payments/checkoutStatus';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import DonationCheckoutForm from './DonationCheckoutForm';

export const dynamic = 'force-dynamic';

type DonationPageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

export default async function DonationPage({
  searchParams,
}: DonationPageProps) {
  const { session_id: sessionId } = await searchParams;
  let confirmationState: CheckoutConfirmationState | null = null;
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
          'session.id': session.id,
          'session.mode': session.mode,
          'session.status': session.status,
          'session.payment_status': session.payment_status,
          'session.metadata.purpose': session.metadata?.purpose,
          amount_total: session.amount_total,
          payment_method_types: session.payment_method_types,
        });

        const isDonationSession =
          session.mode === 'payment' &&
          (session.metadata?.purpose === 'donation' ||
            session.metadata?.type === 'donation');

        const checkoutState = getCheckoutConfirmationState(
          session.status,
          session.payment_status
        );

        if (!isDonationSession) {
          confirmationState = 'error';
        } else if (checkoutState === 'success') {
          confirmationState = 'success';
          try {
            await storeStripeCheckoutSession(session.id);
          } catch {
            // The signed Stripe result is still authoritative for this page.
            // The webhook can safely retry persistence without exposing details.
            console.error('Unable to store the confirmed donation Checkout Session.', {
              sessionId: session.id,
            });
          }
        } else if (checkoutState === 'pending') {
          confirmationState = 'pending';
        } else {
          confirmationState = checkoutState;
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
      {confirmationState === 'incomplete' && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Your donation checkout was not completed yet.
        </p>
      )}
      {confirmationState === 'expired' && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          This donation checkout session expired. Please start again.
        </p>
      )}
      {confirmationState === 'error' && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          We could not confirm this donation checkout. Please try again or
          contact support.
        </p>
      )}
      {confirmationState !== 'success' && confirmationState !== 'pending' && (
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
