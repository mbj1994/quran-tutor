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

type BookedClassLink = {
  class:
    | {
        id: string;
        meeting_url: string | null;
      }
    | {
        id: string;
        meeting_url: string | null;
      }[]
    | null;
};

function firstOrNull<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function ClassesPage() {
  const sb = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await sb.auth.getUser();

  let hasActiveSubscription = false;
  let learners: Learner[] = [];
  const bookedClassLinks = new Map<string, string | null>();

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

    if (learners.length > 0) {
      const { data: bookedRows } = await sb
        .from('enrolments')
        .select(
          `
            class:classes (
              id,
              meeting_url
            )
          `
        )
        .in(
          'learner_profile_id',
          learners.map((learner) => learner.id)
        );

      ((bookedRows ?? []) as BookedClassLink[]).forEach((row) => {
        const bookedClass = firstOrNull(row.class);
        if (bookedClass?.id) {
          bookedClassLinks.set(bookedClass.id, bookedClass.meeting_url);
        }
      });
    }
  }

  const { data: classes } = await sb
    .from('classes')
    .select(
      'id,title,subject,level,language,start_time,duration_min,capacity, enrolments(count)'
    )
    .order('start_time', { ascending: true });

  return (
    <main className="mx-auto max-w-3xl bg-gray-50 p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-950">
          Browse Live Qur&apos;an Classes
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Browse upcoming classes taught by approved Scholars/Ustass.
        </p>
      </div>

      {classes?.length === 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-950">No classes available yet</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            New live classes will appear here once the teaching team schedules
            them.
          </p>
        </section>
      )}

      <ul className="space-y-4">
        {classes?.map((classRow) => {
          const booked = classRow.enrolments[0]?.count ?? 0;
          const spots = classRow.capacity - booked;
          const bookedByCurrentFamily = bookedClassLinks.has(classRow.id);
          const meetingUrl = bookedClassLinks.get(classRow.id);

          return (
            <li
              key={classRow.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="text-lg font-semibold text-gray-950">
                {classRow.title}
              </div>
              <div className="mt-1 space-y-1 text-sm text-gray-600">
                {classRow.subject && <p>Subject: {classRow.subject}</p>}
                {classRow.level && <p>Level: {classRow.level}</p>}
                {classRow.language && <p>Language: {classRow.language}</p>}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                {formatDateTime(classRow.start_time)} - {classRow.duration_min} min
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-700">
                <span className="rounded-full bg-gray-100 px-3 py-1">
                  Capacity: {classRow.capacity}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1">
                  {spots > 0 ? `${spots} spaces available` : 'No spaces available'}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-gray-600">
                  {bookedByCurrentFamily ? 'Already booked' : 'Choose a child to book'}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {bookedByCurrentFamily && meetingUrl && (
                    <a
                      href={meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Join Live Class
                    </a>
                  )}
                  <ClientBookButton
                    classId={classRow.id}
                    disabled={spots === 0}
                    hasActiveSubscription={hasActiveSubscription}
                    learners={learners}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
