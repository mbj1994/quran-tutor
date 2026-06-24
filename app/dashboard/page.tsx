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

type Learner = {
  id: string;
  full_name: string;
};

type BookedClass = {
  id: string;
  title: string;
  start_time: string;
  duration_min: number | null;
};

type Enrolment = {
  id: string;
  learner_profile_id: string | null;
  status: string | null;
  class: BookedClass | BookedClass[] | null;
  learner: Learner | Learner[] | null;
};

type LessonProgress = {
  id: string;
  learner_profile_id: string;
  attendance_status: string;
  notes: string | null;
  homework: string | null;
  updated_at: string | null;
  created_at: string | null;
  class: Pick<BookedClass, 'id' | 'title'> | Pick<BookedClass, 'id' | 'title'>[] | null;
};

function firstOrNull<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function DashboardPage() {
  const sb = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect('/login');

  const [{ data: subscription, error: subscriptionError }, { data: learnerRows, error: learnerError }] =
    await Promise.all([
      sb
        .from('subscriptions')
        .select('status, current_period_end, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<Subscription>(),
      sb
        .from('learners')
        .select('id, full_name')
        .eq('parent_id', user.id)
        .order('full_name', { ascending: true }),
    ]);

  if (subscriptionError) {
    return <p className="p-4 text-red-600">{subscriptionError.message}</p>;
  }

  if (learnerError) {
    return <p className="p-4 text-red-600">{learnerError.message}</p>;
  }

  const learners = (learnerRows ?? []) as Learner[];
  const learnerIds = learners.map((learner) => learner.id);
  const learnerNames = new Map(learners.map((learner) => [learner.id, learner.full_name]));

  let enrolments: Enrolment[] = [];
  let progressRows: LessonProgress[] = [];

  if (learnerIds.length > 0) {
    const [{ data: enrolmentRows, error: enrolmentError }, { data: progressData, error: progressError }] =
      await Promise.all([
        sb
          .from('enrolments')
          .select(
            `
              id,
              learner_profile_id,
              status,
              class:classes!inner (
                id,
                title,
                start_time,
                duration_min
              ),
              learner:learners!enrolments_learner_profile_id_fkey (
                id,
                full_name
              )
            `
          )
          .in('learner_profile_id', learnerIds)
          .gte('classes.start_time', new Date().toISOString())
          .order('start_time', {
            foreignTable: 'classes',
            ascending: true,
          })
          .limit(5),
        sb
          .from('lesson_progress')
          .select(
            `
              id,
              learner_profile_id,
              attendance_status,
              notes,
              homework,
              updated_at,
              created_at,
              class:classes (
                id,
                title
              )
            `
          )
          .in('learner_profile_id', learnerIds)
          .order('updated_at', { ascending: false })
          .limit(5),
      ]);

    if (enrolmentError) {
      return <p className="p-4 text-red-600">{enrolmentError.message}</p>;
    }

    if (progressError) {
      return <p className="p-4 text-red-600">{progressError.message}</p>;
    }

    enrolments = (enrolmentRows ?? []) as Enrolment[];
    progressRows = (progressData ?? []) as LessonProgress[];
  }

  const hasActiveSubscription =
    subscription?.status === 'active' || subscription?.status === 'trialing';

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4">
      <h1 className="text-2xl font-semibold">Parent Dashboard</h1>

      <section className="rounded border p-4 shadow-sm">
        <h2 className="text-lg font-medium">Subscription</h2>
        <p className="mt-2">
          Subscription: {hasActiveSubscription ? 'Active' : 'Not active'}
        </p>
        {subscription?.current_period_end && (
          <p className="mt-1 text-sm text-gray-600">
            Renews or ends on: {formatDate(subscription.current_period_end)}
          </p>
        )}
        {!hasActiveSubscription && (
          <Link
            href="/payments"
            className="mt-4 inline-block rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
          >
            Go to Payments
          </Link>
        )}
      </section>

      <section className="rounded border p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Learners</h2>
          <div className="flex gap-2">
            <Link href="/learners" className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
              View Learners
            </Link>
            <Link
              href="/learners/new"
              className="rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700"
            >
              Add Learner
            </Link>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-600">Total learners: {learners.length}</p>
        {learners.length > 0 ? (
          <ul className="mt-3 list-inside list-disc space-y-1">
            {learners.map((learner) => (
              <li key={learner.id}>{learner.full_name}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-gray-600">No learners added yet.</p>
        )}
      </section>

      <section className="rounded border p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium">Upcoming Booked Classes</h2>
          <Link href="/my-classes" className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
            My Classes
          </Link>
        </div>

        {enrolments.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {enrolments.map((enrolment) => {
              const bookedClass = firstOrNull(enrolment.class);
              const learner = firstOrNull(enrolment.learner);

              return (
                <li key={enrolment.id} className="rounded bg-gray-50 p-3">
                  <div className="font-medium">
                    {bookedClass?.title ?? 'Unknown class'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Learner: {learner?.full_name ?? 'Unknown learner'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {bookedClass ? formatDateTime(bookedClass.start_time) : '-'}
                  </div>
                  <div className="text-xs text-gray-500">
                    Status: {enrolment.status ?? 'booked'}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-4 space-y-3">
            <p>No classes booked yet.</p>
            <Link
              href="/classes"
              className="inline-block rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
            >
              Browse Classes
            </Link>
          </div>
        )}
      </section>

      <section className="rounded border p-4 shadow-sm">
        <h2 className="text-lg font-medium">Latest Progress and Homework</h2>

        {progressRows.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {progressRows.map((progress) => {
              const progressClass = firstOrNull(progress.class);

              return (
                <li key={progress.id} className="rounded bg-gray-50 p-3">
                  <div className="font-medium">
                    {learnerNames.get(progress.learner_profile_id) ?? 'Unknown learner'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Class: {progressClass?.title ?? 'Unknown class'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Attendance: {progress.attendance_status}
                  </div>
                  {progress.notes && (
                    <div className="mt-2 text-sm text-gray-700">Notes: {progress.notes}</div>
                  )}
                  {progress.homework && (
                    <div className="mt-1 text-sm text-gray-700">
                      Homework: {progress.homework}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4">No lesson progress recorded yet.</p>
        )}
      </section>
    </main>
  );
}
