import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

type Subscription = {
  status: string | null;
  current_period_end: string | null;
  created_at: string | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function SubscriptionPage() {
  const sb = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect('/login');

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
    <main className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Subscription Status</h1>

      {isActive ? (
        <div className="rounded border p-5 space-y-3">
          <p>Your subscription is active.</p>
          {data.current_period_end && (
            <p className="text-sm text-gray-600">
              Renews or ends on: {formatDate(data.current_period_end)}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded border p-5 space-y-4">
          <p>You do not have an active subscription yet.</p>
          <Link
            href="/payments"
            className="inline-block rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
          >
            Go to Payments
          </Link>
        </div>
      )}
    </main>
  );
}
