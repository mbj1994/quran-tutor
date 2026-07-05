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
  quran_level: string | null;
  points: number | null;
  lessons_completed: number | null;
  current_badge: string | null;
};

type BookedClass = {
  id: string;
  title: string;
  start_time: string;
  duration_min: number | null;
  meeting_url: string | null;
};

type Enrolment = {
  id: string;
  learner_profile_id: string | null;
  status: string | null;
  class: BookedClass | BookedClass[] | null;
  learner: Pick<Learner, 'id' | 'full_name'> | Pick<Learner, 'id' | 'full_name'>[] | null;
};

type LessonProgress = {
  id: string;
  learner_profile_id: string;
  attendance_status: string;
  notes: string | null;
  homework: string | null;
  covered: string | null;
  revision: string | null;
  parent_note: string | null;
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

function badgeForLessons(lessonsCompleted: number, savedBadge?: string | null) {
  if (savedBadge) return savedBadge;
  if (lessonsCompleted >= 10) return 'Rising Reciter';
  if (lessonsCompleted >= 5) return 'Consistent Learner';
  if (lessonsCompleted >= 1) return "Qur'an Starter";
  return 'New Learner';
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
        .select(
          'id, full_name, quran_level, points, lessons_completed, current_badge'
        )
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
                duration_min,
                meeting_url
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
              covered,
              revision,
              parent_note,
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
  const latestProgressByLearner = new Map<string, LessonProgress>();

  progressRows.forEach((progress) => {
    if (!latestProgressByLearner.has(progress.learner_profile_id)) {
      latestProgressByLearner.set(progress.learner_profile_id, progress);
    }
  });

  return (
    <main className="mx-auto max-w-5xl space-y-6 bg-gray-50 p-4">
      <h1 className="text-2xl font-semibold text-gray-950">Parent Dashboard</h1>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-950">Subscription</h2>
        <p className="mt-2 text-gray-700">
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

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-950">Learners</h2>
          <div className="flex gap-2">
            <Link
              href="/learners"
              className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            >
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
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {learners.map((learner) => {
              const lessonsCompleted = learner.lessons_completed ?? 0;
              const latestProgress = latestProgressByLearner.get(learner.id);
              const latestNote =
                latestProgress?.parent_note ?? latestProgress?.notes ?? null;

              return (
                <li
                  key={learner.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="font-semibold text-gray-950">
                    {learner.full_name}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs uppercase text-gray-500">Lessons</p>
                      <p className="font-medium text-gray-900">
                        {lessonsCompleted}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Points</p>
                      <p className="font-medium text-gray-900">
                        {learner.points ?? 0}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-700">
                    Qur&apos;an level: {learner.quran_level ?? 'Not set yet'}
                  </p>
                  <p className="mt-2 inline-block rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                    {badgeForLessons(lessonsCompleted, learner.current_badge)}
                  </p>
                  {latestNote && (
                    <p className="mt-3 text-sm text-gray-700">
                      Latest note: {latestNote}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
            <h3 className="font-medium text-gray-950">No learners yet</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Add a child profile with their Qur&apos;an level so you can book
              the right live class and track learning rewards.
            </p>
            <Link
              href="/learners/new"
              className="mt-3 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Add learner
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-950">
            Upcoming Booked Classes
          </h2>
          <Link
            href="/my-classes"
            className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          >
            My Classes
          </Link>
        </div>

        {enrolments.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {enrolments.map((enrolment) => {
              const bookedClass = firstOrNull(enrolment.class);
              const learner = firstOrNull(enrolment.learner);

              return (
                <li
                  key={enrolment.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="font-semibold text-gray-950">
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
                  {bookedClass?.meeting_url && (
                    <a
                      href={bookedClass.meeting_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Join Live Class
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
            <h3 className="font-medium text-gray-950">No booked classes yet</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Browse available live Qur&apos;an classes and choose the best
              Scholar/Ustass and level for your child.
            </p>
            <Link
              href="/classes"
              className="mt-3 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Browse classes
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-950">
          Latest Progress and Homework
        </h2>

        {progressRows.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {progressRows.map((progress) => {
              const progressClass = firstOrNull(progress.class);

              return (
                <li
                  key={progress.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="font-semibold text-gray-950">
                    {learnerNames.get(progress.learner_profile_id) ?? 'Unknown learner'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Class: {progressClass?.title ?? 'Unknown class'}
                  </div>
                  <div className="text-sm text-gray-600">
                    Attendance: {progress.attendance_status}
                  </div>
                  {(progress.covered ?? progress.notes) && (
                    <div className="mt-2 text-sm text-gray-700">
                      Covered: {progress.covered ?? progress.notes}
                    </div>
                  )}
                  {(progress.revision ?? progress.homework) && (
                    <div className="mt-1 text-sm text-gray-700">
                      To revise: {progress.revision ?? progress.homework}
                    </div>
                  )}
                  {progress.parent_note && (
                    <div className="mt-1 text-sm text-gray-700">
                      Parent note: {progress.parent_note}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
            <h3 className="font-medium text-gray-950">
              No progress notes yet
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Revision notes, attendance, and child progress will appear after
              a Scholar/Ustass records a lesson update.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
