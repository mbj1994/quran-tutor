import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { storeStripeCheckoutSession } from '@/lib/payments/storeStripeCheckout';
import { getCheckoutConfirmationState } from '@/lib/payments/checkoutStatus';
import { getUserSubscriptionStatus } from '@/lib/payments/subscriptionStatus';
import FriendlyError from '@/components/FriendlyError';

export const dynamic = 'force-dynamic';

type ConfirmationState = 'success' | 'pending' | 'error' | null;

type SubscriptionPageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function SubscriptionPage({
  searchParams,
}: SubscriptionPageProps) {
  const sb = await createServerSupabaseClient();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect('/login');

  const { session_id: sessionId } = await searchParams;
  let confirmationState: ConfirmationState = null;

  if (sessionId) {
    if (!sessionId.startsWith('cs_')) {
      confirmationState = 'error';
    } else {
      try {
        const session = await getStripe().checkout.sessions.retrieve(sessionId);

        console.info('Stripe Checkout Session confirmation:', {
          sessionId: session.id,
          mode: session.mode,
          status: session.status,
          paymentStatus: session.payment_status,
          purpose: session.metadata?.purpose ?? session.metadata?.type,
        });

        const belongsToCurrentUser =
          session.metadata?.type === 'subscription' &&
          session.metadata?.user_id === user.id;

        const checkoutState = getCheckoutConfirmationState(
          session.status,
          session.payment_status
        );

        if (!belongsToCurrentUser) {
          confirmationState = 'error';
        } else if (checkoutState === 'success') {
          await storeStripeCheckoutSession(session.id);
          confirmationState = 'success';
        } else if (checkoutState === 'pending') {
          await storeStripeCheckoutSession(session.id);
          confirmationState = 'pending';
        } else {
          confirmationState = 'error';
        }
      } catch (error) {
        console.error('Stripe Checkout Session confirmation failed:', error);
        confirmationState = 'error';
      }
    }
  }

  // TODO: Full delayed-payment support should update subscriptions from Stripe
  // webhooks: checkout.session.completed, checkout.session.async_payment_succeeded,
  // checkout.session.async_payment_failed, and invoice.payment_succeeded.

  const subscriptionStatus = await getUserSubscriptionStatus(sb, user.id);

  if (subscriptionStatus.error) {
    return <FriendlyError />;
  }

  const { state, subscription } = subscriptionStatus;

  return (
    <main className="mx-auto max-w-2xl space-y-6 bg-transparent p-4 sm:p-6">
      <div className="rounded-2xl border border-emerald-100 bg-white/90 p-6 shadow-sm shadow-emerald-950/5 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">Family plan</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-950">Billing</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Simple access to Live Qur’an Classes for your children.
        </p>
      </div>

      {confirmationState === 'success' && (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Your payment was confirmed and your subscription is being updated.
        </p>
      )}
      {confirmationState === 'pending' && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Your bank payment is processing. We&apos;ll activate access once Stripe
          confirms it.
        </p>
      )}
      {confirmationState === 'error' && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          We could not confirm this checkout. Please try again or contact
          support.
        </p>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm shadow-emerald-950/5">
        <h2 className="font-semibold text-gray-950">Family learning plan</h2>
        <ul className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
          <li>✓ Live Qur’an Classes</li>
          <li>✓ Trusted Scholar / Ustass teaching</li>
          <li>✓ Learning Progress</li>
          <li>✓ Attendance and revision notes</li>
        </ul>
      </section>

      {state === 'active' ? (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm shadow-emerald-950/5">
          <p className="font-medium text-gray-950">Subscription active</p>
          {subscription?.current_period_end && (
            <p className="text-sm text-gray-600">
              Renews or ends on: {formatDate(subscription.current_period_end)}
            </p>
          )}
        </div>
      ) : state === 'pending' ? (
        <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-medium text-amber-950">Payment processing</p>
          <p className="text-sm leading-6 text-amber-900">
            Your bank payment is processing. We&apos;ll activate access once Stripe
            confirms it.
          </p>
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm shadow-emerald-950/5">
          <div>
            <h2 className="font-semibold text-gray-950">
              No active subscription yet
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Start a family subscription to book live Qur&apos;an classes for
              your children.
            </p>
          </div>
          <Link
            href="/payments"
            className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700 sm:w-fit"
          >
            Start subscription
          </Link>
        </div>
      )}

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-semibold text-emerald-950">Support Quran Tutor</h2>
        <p className="mt-2 text-sm leading-6 text-gray-700">
          Your subscription covers your family plan. A separate, optional donation
          can help sponsor Qur&apos;an learning for more children.
        </p>
        <Link
          href="/donation"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-white"
        >
          Make a Donation
        </Link>
      </section>
    </main>
  );
}
