import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

type BookedClass = {
  id: string;
  title: string;
  subject: string | null;
  level: string | null;
  language: string | null;
  start_time: string;
  duration_min: number;
  meeting_url: string | null;
};

type Learner = {
  id: string;
  full_name: string;
  quran_level: string | null;
  lessons_completed: number | null;
  points: number | null;
  current_badge: string | null;
};

type LearnerSummary = Pick<Learner, 'id'>;

type Enrolment = {
  id: string;
  learner_profile_id: string | null;
  status: string | null;
  class: BookedClass | BookedClass[] | null;
  learner: Learner | Learner[] | null;
};

type LessonProgress = {
  class_id: string;
  learner_profile_id: string;
  attendance_status: string;
  notes: string | null;
  homework: string | null;
  covered: string | null;
  revision: string | null;
  parent_note: string | null;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function MyClasses() {
  const sb = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login');

  const { data: learnerRows, error: learnerError } = await sb
    .from('learners')
    .select('id')
    .eq('parent_id', user.id);

  if (learnerError) {
    return <p className="p-4 text-red-600">{learnerError.message}</p>;
  }

  const ownedLearnerIds = ((learnerRows ?? []) as LearnerSummary[]).map(
    (learner) => learner.id
  );

  if (ownedLearnerIds.length === 0) {
    return (
      <main className="mx-auto max-w-3xl bg-gray-50 p-4">
        <h1 className="mb-4 text-2xl font-semibold text-gray-950">
          My Live Classes
        </h1>
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-950">Add a child first</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Create a child profile with their Qur&apos;an level before booking
            live classes.
          </p>
          <Link
            href="/learners/new"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Add child
          </Link>
        </section>
      </main>
    );
  }

  const { data, error } = await sb
    .from('enrolments')
    .select(
      `
        id,
        learner_profile_id,
        status,
        class:classes (
          id,
          title,
          subject,
          level,
          language,
          start_time,
          duration_min,
          meeting_url
        ),
        learner:learners!enrolments_learner_profile_id_fkey (
          id,
          full_name,
          quran_level,
          lessons_completed,
          points,
          current_badge
        )
      `
    )
    .in('learner_profile_id', ownedLearnerIds)
    .order('start_time', {
      foreignTable: 'classes',
      ascending: true,
    });

  if (error) {
    return <p className="p-4 text-red-600">{error.message}</p>;
  }

  const enrolments = (data ?? []) as Enrolment[];
  const classIds = enrolments
    .map((enrolment) => {
      const bookedClass = Array.isArray(enrolment.class)
        ? enrolment.class[0]
        : enrolment.class;

      return bookedClass?.id;
    })
    .filter((classId): classId is string => Boolean(classId));
  const learnerProfileIds = enrolments
    .map((enrolment) => enrolment.learner_profile_id)
    .filter((learnerId): learnerId is string => Boolean(learnerId));

  let progressRows: LessonProgress[] = [];

  if (classIds.length > 0 && learnerProfileIds.length > 0) {
    const { data: progressData } = await sb
      .from('lesson_progress')
      .select(
        'class_id, learner_profile_id, attendance_status, notes, homework, covered, revision, parent_note'
      )
      .in('class_id', classIds)
      .in('learner_profile_id', learnerProfileIds);

    progressRows = (progressData ?? []) as LessonProgress[];
  }

  const progressByBooking = new Map(
    progressRows.map((progress) => [
      `${progress.class_id}:${progress.learner_profile_id}`,
      progress,
    ])
  );

  return (
    <main className="mx-auto max-w-4xl bg-gray-50 p-4 sm:p-6">
      <div className="mb-5 space-y-2">
        <h1 className="text-2xl font-semibold text-gray-950">
          My Live Classes
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-gray-600">
          See your children&apos;s booked classes, live links, attendance, and revision notes.
        </p>
      </div>

      {enrolments.length === 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-950">
            You have not booked any live classes yet.
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Once you book a live Qur&apos;an class for a child, the schedule
            and class link will appear here.
          </p>
          <Link
            href="/classes"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Browse classes
          </Link>
        </section>
      )}

      <ul className="space-y-4">
        {enrolments.map((enrolment) => {
          const bookedClass = Array.isArray(enrolment.class)
            ? enrolment.class[0]
            : enrolment.class;
          const learner = Array.isArray(enrolment.learner)
            ? enrolment.learner[0]
            : enrolment.learner;
          const progress =
            bookedClass && enrolment.learner_profile_id
              ? progressByBooking.get(
                  `${bookedClass.id}:${enrolment.learner_profile_id}`
                )
              : undefined;

          return (
            <li
              key={enrolment.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="text-lg font-semibold text-gray-950">
                {bookedClass ? bookedClass.title : 'Unknown class'}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                Scholar/Ustass: Approved teacher
              </div>
              <div className="text-sm text-gray-500">
                {bookedClass
                  ? `${formatDateTime(bookedClass.start_time)} - ${bookedClass.duration_min} min`
                  : '-'}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Child: {learner?.full_name ?? 'Unknown child'}
              </div>
              {bookedClass && (
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-700">
                  {bookedClass.subject && (
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      Subject: {bookedClass.subject}
                    </span>
                  )}
                  {bookedClass.level && (
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      Level: {bookedClass.level}
                    </span>
                  )}
                  {bookedClass.language && (
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      Language: {bookedClass.language}
                    </span>
                  )}
                </div>
              )}
              {learner && (
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-700">
                  <span className="rounded-full bg-gray-100 px-3 py-1">
                    My Qur&apos;an Level: {learner.quran_level ?? 'Not set yet'}
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1">
                    Lessons Completed: {learner.lessons_completed ?? 0}
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1">
                    My Points: {learner.points ?? 0}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                    My Badge: {learner.current_badge ?? 'New Learner'}
                  </span>
                </div>
              )}
              {enrolment.status && (
                <div className="mt-1 text-xs text-gray-400">
                  Status: {enrolment.status}
                </div>
              )}
              {bookedClass && (
                bookedClass.meeting_url ? (
                  <a
                    href={bookedClass.meeting_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Join Live Class
                  </a>
                ) : (
                  <p className="mt-3 text-sm font-medium text-gray-600">
                    Live link will be added before class.
                  </p>
                )
              )}
              {progress && (
                <div className="mt-3 space-y-1 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  <div>Attendance: {progress.attendance_status}</div>
                  {(progress.covered ?? progress.notes) && (
                    <div>What was covered: {progress.covered ?? progress.notes}</div>
                  )}
                  {(progress.revision ?? progress.homework) && (
                    <div>What to Revise: {progress.revision ?? progress.homework}</div>
                  )}
                  {progress.parent_note && (
                    <div>Parent note: {progress.parent_note}</div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
