import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

type ProgressPageProps = {
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
  lessons_completed: number | null;
  points: number | null;
  current_badge: string | null;
};

type EnrolmentRow = {
  id: string;
  learner_profile_id: string | null;
  learner: LearnerRow | LearnerRow[] | null;
};

type LessonProgress = {
  id: string;
  class_id: string;
  learner_profile_id: string;
  attendance_status: string;
  notes: string | null;
  homework: string | null;
  covered: string | null;
  revision: string | null;
  parent_note: string | null;
};

const attendanceOptions = ['present', 'absent', 'late'] as const;
const badgeOptions = [
  'New Learner',
  "Qur'an Starter",
  'Consistent Learner',
  'Rising Reciter',
] as const;

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

async function saveProgress(formData: FormData) {
  'use server';

  const sb = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect('/login');

  const classId = String(formData.get('class_id') ?? '');
  const learnerProfileId = String(formData.get('learner_profile_id') ?? '');
  const attendanceStatus = String(
    formData.get('attendance_status') ?? 'present'
  );
  const quranLevel = String(formData.get('quran_level') ?? '').trim();
  const lessonsCompleted = Math.max(
    0,
    Number(formData.get('lessons_completed') ?? 0)
  );
  const points = Math.max(0, Number(formData.get('points') ?? 0));
  const submittedBadge = String(formData.get('current_badge') ?? '').trim();
  const progressNote = String(formData.get('progress_note') ?? '').trim();

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
    redirect(`/scholar/classes/${classId}/progress`);
  }

  const currentBadge =
    submittedBadge ||
    badgeForLessons(Number.isFinite(lessonsCompleted) ? lessonsCompleted : 0);

  const { error: learnerError } = await sb
    .from('learners')
    .update({
      quran_level: quranLevel || null,
      lessons_completed: Number.isFinite(lessonsCompleted)
        ? lessonsCompleted
        : 0,
      points: Number.isFinite(points) ? points : 0,
      current_badge: currentBadge,
    })
    .eq('id', learnerProfileId);

  if (learnerError) {
    redirect(
      `/scholar/classes/${classId}/progress?error=${encodeURIComponent(
        learnerError.message
      )}`
    );
  }

  const { error } = await sb.from('lesson_progress').upsert(
    {
      class_id: classId,
      learner_profile_id: learnerProfileId,
      scholar_id: user.id,
      attendance_status: attendanceStatus,
      parent_note: progressNote || null,
      notes: progressNote || null,
    },
    { onConflict: 'class_id,learner_profile_id' }
  );

  if (error) {
    redirect(
      `/scholar/classes/${classId}/progress?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidatePath(`/scholar/classes/${classId}/progress`);
  revalidatePath(`/scholar/classes/${classId}/roster`);
  revalidatePath('/dashboard');
  revalidatePath('/my-classes');
  redirect(`/scholar/classes/${classId}/progress?saved=1`);
}

export default async function ScholarClassProgressPage({
  params,
}: ProgressPageProps) {
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

  const [{ data: enrolmentData, error: enrolmentError }, { data: progressData }] =
    await Promise.all([
      sb
        .from('enrolments')
        .select(
          `
            id,
            learner_profile_id,
            learner:learners!enrolments_learner_profile_id_fkey (
              id,
              full_name,
              age,
              preferred_language,
              quran_level,
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
          'id, class_id, learner_profile_id, attendance_status, notes, homework, covered, revision, parent_note'
        )
        .eq('class_id', classRow.id),
    ]);

  if (enrolmentError) {
    return <p className="p-4 text-red-600">{enrolmentError.message}</p>;
  }

  const enrolments = (enrolmentData ?? []) as EnrolmentRow[];
  const progressRows = (progressData ?? []) as LessonProgress[];
  const progressByLearner = new Map(
    progressRows.map((progress) => [progress.learner_profile_id, progress])
  );

  return (
    <main className="mx-auto max-w-4xl bg-gray-50 p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-950">
            Progress: {classRow.title}
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

      {enrolments.length === 0 ? (
        <p className="text-gray-600">No learners booked yet.</p>
      ) : (
        <ul className="space-y-4">
          {enrolments.map((enrolment) => {
            const learner = firstOrNull(enrolment.learner);
            const learnerProfileId = enrolment.learner_profile_id ?? learner?.id;
            const progress = learnerProfileId
              ? progressByLearner.get(learnerProfileId)
              : undefined;

            return (
              <li
                key={enrolment.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3">
                  <div className="font-medium">
                    {learner?.full_name ?? 'Unknown learner'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {learner?.age !== null && learner?.age !== undefined
                      ? `Age: ${learner.age}`
                      : 'Age: -'}
                    {' - '}
                    Preferred language: {learner?.preferred_language ?? '-'}
                  </div>
                </div>

                {learnerProfileId ? (
                  <form action={saveProgress} className="space-y-3">
                    <input type="hidden" name="class_id" value={classRow.id} />
                    <input
                      type="hidden"
                      name="learner_profile_id"
                      value={learnerProfileId}
                    />

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium">
                        Attendance
                      </span>
                      <select
                        name="attendance_status"
                        defaultValue={progress?.attendance_status ?? 'present'}
                        className="w-full rounded border p-2"
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="late">Late</option>
                      </select>
                    </label>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium">
                          Current Qur&apos;an level
                        </span>
                        <input
                          name="quran_level"
                          defaultValue={learner?.quran_level ?? ''}
                          className="w-full rounded border p-2"
                          placeholder="Quran reading beginner"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm font-medium">
                          Current badge
                        </span>
                        <select
                          name="current_badge"
                          defaultValue={
                            learner?.current_badge ??
                            badgeForLessons(learner?.lessons_completed ?? 0)
                          }
                          className="w-full rounded border p-2"
                        >
                          {badgeOptions.map((badge) => (
                            <option key={badge} value={badge}>
                              {badge}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm font-medium">
                          Lessons completed
                        </span>
                        <input
                          name="lessons_completed"
                          type="number"
                          min={0}
                          defaultValue={learner?.lessons_completed ?? 0}
                          className="w-full rounded border p-2"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-sm font-medium">
                          Points
                        </span>
                        <input
                          name="points"
                          type="number"
                          min={0}
                          defaultValue={learner?.points ?? 0}
                          className="w-full rounded border p-2"
                        />
                      </label>
                    </div>

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium">
                        Progress note for parent
                      </span>
                      <textarea
                        name="progress_note"
                        defaultValue={
                          progress?.parent_note ?? progress?.notes ?? ''
                        }
                        className="min-h-24 w-full rounded border p-2"
                      />
                    </label>

                    <button className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">
                      Save Progress
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-red-600">
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
