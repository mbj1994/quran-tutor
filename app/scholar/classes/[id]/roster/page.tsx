import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

type RosterPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ClassRow = {
  id: string;
  scholar_id: string;
  title: string;
  start_time: string;
  duration_min: number;
};

type LearnerRow = {
  id: string;
  full_name: string;
  age: number | null;
  preferred_language: string | null;
  quran_level: string | null;
  learning_goals: string | null;
  lessons_completed: number | null;
  points: number | null;
  current_badge: string | null;
};

type EnrolmentRow = {
  id: string;
  status: string | null;
  created_at: string | null;
  learner: LearnerRow | LearnerRow[] | null;
};

type LessonProgress = {
  id: string;
  learner_profile_id: string;
  attendance_status: string;
  covered: string | null;
  revision: string | null;
  parent_note: string | null;
  notes: string | null;
  homework: string | null;
};

const attendanceOptions = ['present', 'absent', 'late'] as const;

function firstOrNull<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function badgeForLessons(lessonsCompleted: number) {
  if (lessonsCompleted >= 10) return 'Rising Reciter';
  if (lessonsCompleted >= 5) return 'Consistent Learner';
  if (lessonsCompleted >= 1) return "Qur'an Starter";
  return 'New Learner';
}

async function saveRosterProgress(formData: FormData) {
  'use server';

  const sb = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect('/login');

  const classId = String(formData.get('class_id') ?? '');
  const learnerProfileId = String(formData.get('learner_profile_id') ?? '');
  const attendanceStatus = String(formData.get('attendance_status') ?? '');
  const covered = String(formData.get('covered') ?? '').trim();
  const revision = String(formData.get('revision') ?? '').trim();
  const parentNote = String(formData.get('parent_note') ?? '').trim();

  if (
    !classId ||
    !learnerProfileId ||
    !attendanceOptions.includes(
      attendanceStatus as (typeof attendanceOptions)[number]
    )
  ) {
    redirect('/scholar/classes');
  }

  const { data: classRow } = await sb
    .from('classes')
    .select('id, scholar_id')
    .eq('id', classId)
    .maybeSingle<{ id: string; scholar_id: string }>();

  if (!classRow || classRow.scholar_id !== user.id) {
    redirect('/scholar/classes');
  }

  const { data: enrolment } = await sb
    .from('enrolments')
    .select('id')
    .eq('class_id', classId)
    .eq('learner_profile_id', learnerProfileId)
    .maybeSingle<{ id: string }>();

  if (!enrolment) {
    redirect(`/scholar/classes/${classId}/roster`);
  }

  const { data: existingProgress } = await sb
    .from('lesson_progress')
    .select('attendance_status')
    .eq('class_id', classId)
    .eq('learner_profile_id', learnerProfileId)
    .maybeSingle<{ attendance_status: string }>();

  const { error } = await sb.from('lesson_progress').upsert(
    {
      class_id: classId,
      learner_profile_id: learnerProfileId,
      scholar_id: user.id,
      attendance_status: attendanceStatus,
      covered: covered || null,
      revision: revision || null,
      parent_note: parentNote || null,
      notes: covered || null,
      homework: revision || null,
    },
    { onConflict: 'class_id,learner_profile_id' }
  );

  if (error) {
    redirect(
      `/scholar/classes/${classId}/roster?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  if (
    attendanceStatus === 'present' &&
    existingProgress?.attendance_status !== 'present'
  ) {
    const { data: learner } = await sb
      .from('learners')
      .select('lessons_completed, points')
      .eq('id', learnerProfileId)
      .maybeSingle<{ lessons_completed: number | null; points: number | null }>();

    const lessonsCompleted = (learner?.lessons_completed ?? 0) + 1;
    const points = (learner?.points ?? 0) + 10;

    const { error: learnerError } = await sb
      .from('learners')
      .update({
        lessons_completed: lessonsCompleted,
        points,
        current_badge: badgeForLessons(lessonsCompleted),
      })
      .eq('id', learnerProfileId);

    if (learnerError) {
      redirect(
        `/scholar/classes/${classId}/roster?error=${encodeURIComponent(
          learnerError.message
        )}`
      );
    }
  }

  revalidatePath(`/scholar/classes/${classId}/roster`);
  revalidatePath(`/scholar/classes/${classId}/progress`);
  revalidatePath('/dashboard');
  revalidatePath('/my-classes');
  redirect(`/scholar/classes/${classId}/roster?saved=1`);
}

export default async function ScholarClassRosterPage({
  params,
}: RosterPageProps) {
  const { id } = await params;
  const sb = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect('/login');

  const { data: classRow, error: classError } = await sb
    .from('classes')
    .select('id, scholar_id, title, start_time, duration_min')
    .eq('id', id)
    .maybeSingle<ClassRow>();

  if (classError) {
    return <p className="p-4 text-red-600">{classError.message}</p>;
  }

  if (!classRow || classRow.scholar_id !== user.id) {
    return <p className="p-4 text-red-600">Access denied.</p>;
  }

  const [{ data, error }, { data: progressData }] = await Promise.all([
    sb
      .from('enrolments')
      .select(
        `
          id,
          status,
          created_at,
          learner:learners!enrolments_learner_profile_id_fkey (
            id,
            full_name,
            age,
            preferred_language,
            quran_level,
            learning_goals,
            lessons_completed,
            points,
            current_badge
          )
        `
      )
      .eq('class_id', classRow.id)
      .order('created_at', { ascending: true }),
    sb
      .from('lesson_progress')
      .select(
        'id, learner_profile_id, attendance_status, covered, revision, parent_note, notes, homework'
      )
      .eq('class_id', classRow.id),
  ]);

  if (error) {
    return <p className="p-4 text-red-600">{error.message}</p>;
  }

  const enrolments = (data ?? []) as EnrolmentRow[];
  const progressRows = (progressData ?? []) as LessonProgress[];
  const progressByLearner = new Map(
    progressRows.map((progress) => [progress.learner_profile_id, progress])
  );

  return (
    <main className="mx-auto max-w-4xl bg-gray-50 p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-950">
            {classRow.title}
          </h1>
          <p className="text-sm text-gray-500">
            {formatDateTime(classRow.start_time)} - {classRow.duration_min} min
          </p>
        </div>
        <Link
          href="/scholar/classes"
          className="text-sm text-emerald-700 underline"
        >
          Back to classes
        </Link>
      </div>

      <p className="mb-4 text-sm text-gray-600">
        Total enrolled: {enrolments.length}
      </p>

      {enrolments.length === 0 ? (
        <p className="text-gray-600">No learners booked yet.</p>
      ) : (
        <ul className="space-y-4">
          {enrolments.map((enrolment) => {
            const learner = firstOrNull(enrolment.learner);
            const learnerProfileId = learner?.id;
            const progress = learnerProfileId
              ? progressByLearner.get(learnerProfileId)
              : undefined;

            return (
              <li
                key={enrolment.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-950">
                      {learner?.full_name ?? 'Unknown learner'}
                    </h2>
                    <div className="mt-1 space-y-1 text-sm text-gray-600">
                      <p>Age: {learner?.age ?? '-'}</p>
                      <p>
                        Preferred language: {learner?.preferred_language ?? '-'}
                      </p>
                      <p>Qur&apos;an level: {learner?.quran_level ?? 'Not set yet'}</p>
                      {learner?.learning_goals && (
                        <p>Learning goals: {learner.learning_goals}</p>
                      )}
                    </div>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                    {progress?.attendance_status ?? 'Not marked'}
                  </span>
                </div>

                {learnerProfileId ? (
                  <form action={saveRosterProgress} className="mt-4 space-y-3">
                    <input type="hidden" name="class_id" value={classRow.id} />
                    <input
                      type="hidden"
                      name="learner_profile_id"
                      value={learnerProfileId}
                    />

                    <fieldset>
                      <legend className="mb-2 text-sm font-medium text-gray-800">
                        Attendance
                      </legend>
                      <div className="flex flex-wrap gap-2">
                        {attendanceOptions.map((status) => (
                          <label
                            key={status}
                            className="flex items-center gap-2 rounded border border-gray-300 px-3 py-2 text-sm text-gray-700"
                          >
                            <input
                              type="radio"
                              name="attendance_status"
                              value={status}
                              defaultChecked={
                                (progress?.attendance_status ?? 'present') === status
                              }
                            />
                            <span className="capitalize">{status}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-gray-800">
                          What was covered
                        </span>
                        <textarea
                          name="covered"
                          defaultValue={progress?.covered ?? progress?.notes ?? ''}
                          className="min-h-24 w-full rounded border p-2"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-gray-800">
                          What to revise
                        </span>
                        <textarea
                          name="revision"
                          defaultValue={progress?.revision ?? progress?.homework ?? ''}
                          className="min-h-24 w-full rounded border p-2"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-gray-800">
                          Parent note
                        </span>
                        <textarea
                          name="parent_note"
                          defaultValue={progress?.parent_note ?? ''}
                          className="min-h-24 w-full rounded border p-2"
                        />
                      </label>
                    </div>

                    <button className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">
                      Save Attendance
                    </button>
                  </form>
                ) : (
                  <p className="mt-3 text-sm text-red-600">
                    This booking is missing a learner profile.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
