import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { getStripe } from '@/lib/stripe';
import { storeStripeCheckoutSession } from '@/lib/payments/storeStripeCheckout';

export const dynamic = 'force-dynamic';

type Subscription = {
  status: string | null;
  current_period_end: string | null;
  created_at: string | null;
};

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
  const sb = createServerComponentClient({ cookies });

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
          status: session.status,
          paymentStatus: session.payment_status,
        });

        const belongsToCurrentUser =
          session.metadata?.type === 'subscription' &&
          session.metadata?.user_id === user.id;

        if (!belongsToCurrentUser || session.status !== 'complete') {
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
        console.error('Stripe Checkout Session confirmation failed:', error);
        confirmationState = 'error';
      }
    }
  }

  // TODO: Full delayed-payment support should update subscriptions from Stripe
  // webhooks: checkout.session.completed, checkout.session.async_payment_succeeded,
  // checkout.session.async_payment_failed, and invoice.payment_succeeded.

  const { data, error } = await sb
    .from('subscriptions')
    .select('status, current_period_end, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<Subscription>();

  if (error) {
    return <p className="p-4 text-red-600">{error.message}</p>;
  }

  const isActive = data?.status === 'active' || data?.status === 'trialing';

  return (
    <main className="mx-auto max-w-2xl space-y-6 bg-gray-50 p-4 sm:p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-950">Billing</h1>
        <p className="text-sm leading-6 text-gray-600">
          Subscribe so your children can book and attend live Qur&apos;an classes.
        </p>
      </div>

      {confirmationState === 'success' && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Your payment was confirmed and your subscription is being updated.
        </p>
      )}
      {confirmationState === 'pending' && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Your bank payment is processing. Your subscription will activate once
          Stripe confirms the payment.
        </p>
      )}
      {confirmationState === 'error' && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          We could not confirm this checkout. Please try again or contact
          support.
        </p>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-gray-950">Family learning plan</h2>
        <ul className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
          <li>Live Classes with approved Scholar / Ustass teachers</li>
          <li>Child progress tracking</li>
          <li>Attendance and revision notes</li>
          <li>Learning rewards</li>
        </ul>
      </section>

      {isActive ? (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="font-medium text-gray-950">
            Your family subscription is active.
          </p>
          {data.current_period_end && (
            <p className="text-sm text-gray-600">
              Renews or ends on: {formatDate(data.current_period_end)}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
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
            className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Start subscription
          </Link>
        </div>
      )}
    </main>
  );
}
