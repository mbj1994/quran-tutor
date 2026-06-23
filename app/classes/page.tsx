import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import ClientBookButton from './BookButton';

export const dynamic = 'force-dynamic';

type Subscription = {
  status: string | null;
};

type Learner = {
  id: string;
  full_name: string;
};

export default async function ClassesPage() {
  const sb = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await sb.auth.getUser();

  let hasActiveSubscription = false;
  let learners: Learner[] = [];

  if (user) {
    const { data: subscription } = await sb
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<Subscription>();

    hasActiveSubscription =
      subscription?.status === 'active' || subscription?.status === 'trialing';

    const { data: learnerRows } = await sb
      .from('learners')
      .select('id, full_name')
      .eq('parent_id', user.id)
      .order('full_name', { ascending: true });

    learners = (learnerRows ?? []) as Learner[];
  }

  const { data: classes } = await sb
    .from('classes')
    .select('id,title,start_time,duration_min,capacity, enrolments(count)')
    .order('start_time', { ascending: true });

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-semibold">Available Classes</h1>

      <ul className="space-y-4">
        {classes?.map((c) => {
          const booked = c.enrolments[0]?.count ?? 0;
          const spots = c.capacity - booked;

          return (
            <li key={c.id} className="rounded border p-4 shadow-sm">
              <div className="font-medium">{c.title}</div>
              <div className="text-sm text-gray-500">
                {new Date(c.start_time).toLocaleString()} · {c.duration_min} min
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm">
                  {spots > 0 ? `${spots} spots left` : 'Full'}
                </span>
                <ClientBookButton
                  classId={c.id}
                  disabled={spots === 0}
                  hasActiveSubscription={hasActiveSubscription}
                  learners={learners}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
