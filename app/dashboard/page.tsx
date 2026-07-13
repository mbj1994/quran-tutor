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
  age: number | null;
  preferred_language: string | null;
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
          'id, full_name, age, preferred_language, quran_level, points, lessons_completed, current_badge'
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
    <main className="mx-auto max-w-5xl space-y-6 bg-gray-50 p-4 sm:p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-950">Family Dashboard</h1>
        <p className="max-w-2xl text-sm leading-6 text-gray-600">
          Manage your children&apos;s Qur&apos;an learning, live classes, and progress.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/learners"
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-emerald-200"
        >
          <p className="text-sm text-gray-500">Children</p>
          <p className="mt-2 text-2xl font-semibold text-gray-950">{learners.length}</p>
        </Link>
        <Link
          href="/my-classes"
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-emerald-200"
        >
          <p className="text-sm text-gray-500">Upcoming live classes</p>
          <p className="mt-2 text-2xl font-semibold text-gray-950">{enrolments.length}</p>
        </Link>
        <Link
          href="/subscription"
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-emerald-200"
        >
          <p className="text-sm text-gray-500">Billing status</p>
          <p className="mt-2 text-lg font-semibold text-gray-950">
            {hasActiveSubscription ? 'Active' : 'Not active'}
          </p>
        </Link>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Learning progress</p>
          <p className="mt-2 text-2xl font-semibold text-gray-950">{progressRows.length}</p>
        </div>
      </section>

      <section className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <Link
          href="/learners/new"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Add a child
        </Link>
        <Link
          href="/classes"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          Browse classes
        </Link>
        <Link
          href="/my-classes"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          View my live classes
        </Link>
        <Link
          href="/subscription"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          Manage billing
        </Link>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-950">Billing</h2>
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
            href="/subscription"
            className="mt-4 inline-block rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
          >
            Go to Billing
          </Link>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-950">Children</h2>
          <div className="flex gap-2">
            <Link
              href="/learners"
              className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            >
              View Children
            </Link>
            <Link href="/learners/new" className="rounded bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700">
              Add a child
            </Link>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-600">Total children: {learners.length}</p>
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
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
                    {learner.age !== null && (
                      <span className="rounded-full bg-white px-2 py-1">
                        Age {learner.age}
                      </span>
                    )}
                    <span className="rounded-full bg-white px-2 py-1">
                      {learner.preferred_language ?? 'Language not set'}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs uppercase text-gray-500">
                        My Qur&apos;an Level
                      </p>
                      <p className="font-medium text-gray-900">
                        {learner.quran_level ?? 'Not set yet'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">
                        Lessons Completed
                      </p>
                      <p className="font-medium text-gray-900">
                        {lessonsCompleted}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">My Points</p>
                      <p className="font-medium text-gray-900">
                        {learner.points ?? 0}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 inline-block rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                    My Badge: {badgeForLessons(lessonsCompleted, learner.current_badge)}
                  </p>
                  {latestNote && (
                    <p className="mt-3 text-sm text-gray-700">
                      <span className="font-medium text-gray-900">What to Revise:</span>{' '}
                      {latestNote}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
            <h3 className="font-medium text-gray-950">
              You have not added any children yet.
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Add a child profile with their Qur&apos;an level so you can book
              the right live class and track learning rewards.
            </p>
            <Link
              href="/learners/new"
              className="mt-3 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Add a child
            </Link>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-950">
            Upcoming live classes
          </h2>
          <Link
            href="/my-classes"
            className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          >
            My Live Classes
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
            <h3 className="font-medium text-gray-950">
              You have not booked any live classes yet.
            </h3>
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
                      What to Revise: {progress.revision ?? progress.homework}
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
              No progress notes have been added yet.
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
