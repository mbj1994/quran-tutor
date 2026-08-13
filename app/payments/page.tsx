import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getUserSubscriptionStatus } from '@/lib/payments/subscriptionStatus';
import FriendlyError from '@/components/FriendlyError';
import SubscriptionCheckoutButton from './SubscriptionCheckoutButton';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const sb = await createServerSupabaseClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl space-y-6 bg-gray-50 p-6">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-950">
            Payment Checkout
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
          <div className="mt-5 border-t border-gray-200 pt-5">
            <h2 className="font-semibold text-gray-950">Support Quran Tutor</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Donations are separate from subscriptions and do not require an
              account.
            </p>
            <Link
              href="/donation"
              className="mt-3 inline-block rounded-lg border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              Make a Donation
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const subscriptionStatus = await getUserSubscriptionStatus(sb, user.id);

  if (subscriptionStatus.error) {
    return <FriendlyError />;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 bg-gray-50 p-6">
      <h1 className="text-2xl font-semibold text-gray-950">Payment Checkout</h1>

      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-medium text-gray-950">Family Subscription</h2>
        {subscriptionStatus.state === 'active' ? (
          <>
            <p className="font-medium text-emerald-800">Subscription active</p>
            <Link href="/subscription" className="text-sm font-medium text-emerald-700 underline">
              Manage billing
            </Link>
          </>
        ) : subscriptionStatus.state === 'pending' ? (
          <>
            <p className="text-sm leading-6 text-amber-900">
              Your bank payment is processing. We&apos;ll activate access once Stripe
              confirms it.
            </p>
            <Link href="/subscription" className="text-sm font-medium text-amber-900 underline">
              View payment status
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Subscribe monthly to book live Qur&apos;an classes and support approved
              Scholars/Ustass.
            </p>
            <SubscriptionCheckoutButton />
          </>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-medium text-gray-950">Sponsor a Learner</h2>
        <p className="text-sm text-gray-600">
          Make a donation to help diaspora children access Qur&apos;an learning.
        </p>
        <Link href="/donation" className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-white">
          Make a Donation
        </Link>
      </div>
    </main>
  );
}
