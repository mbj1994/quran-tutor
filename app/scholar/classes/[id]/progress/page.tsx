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
};

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
  const notes = String(formData.get('notes') ?? '').trim();
  const homework = String(formData.get('homework') ?? '').trim();

  if (!classId || !learnerProfileId) {
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

  const { error } = await sb.from('lesson_progress').upsert(
    {
      class_id: classId,
      learner_profile_id: learnerProfileId,
      scholar_id: user.id,
      attendance_status: attendanceStatus,
      notes: notes || null,
      homework: homework || null,
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
              preferred_language
            )
          `
        )
        .eq('class_id', classRow.id)
        .order('created_at', { ascending: true }),
      sb
        .from('lesson_progress')
        .select(
          'id, class_id, learner_profile_id, attendance_status, notes, homework'
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
    <main className="mx-auto max-w-3xl p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Progress: {classRow.title}</h1>
          <p className="text-sm text-gray-500">
            {new Date(classRow.start_time).toLocaleString()} -{' '}
            {classRow.duration_min} min
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
        <p>No learners booked yet.</p>
      ) : (
        <ul className="space-y-4">
          {enrolments.map((enrolment) => {
            const learner = Array.isArray(enrolment.learner)
              ? enrolment.learner[0]
              : enrolment.learner;
            const learnerProfileId = enrolment.learner_profile_id ?? learner?.id;
            const progress = learnerProfileId
              ? progressByLearner.get(learnerProfileId)
              : undefined;

            return (
              <li key={enrolment.id} className="rounded border p-4 shadow-sm">
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

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium">
                        Notes
                      </span>
                      <textarea
                        name="notes"
                        defaultValue={progress?.notes ?? ''}
                        className="min-h-24 w-full rounded border p-2"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-medium">
                        Homework
                      </span>
                      <textarea
                        name="homework"
                        defaultValue={progress?.homework ?? ''}
                        className="min-h-20 w-full rounded border p-2"
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
