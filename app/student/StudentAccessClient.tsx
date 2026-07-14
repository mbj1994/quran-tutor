'use client';

import { FormEvent, useMemo, useState } from 'react';

type Learner = {
  id: string;
  full_name: string;
  quran_level: string | null;
  learning_goals: string | null;
  points: number | null;
  lessons_completed: number | null;
  current_badge: string | null;
};

type BookedClass = {
  id: string;
  title: string;
  subject: string | null;
  level: string | null;
  language: string | null;
  start_time: string;
  duration_min: number | null;
  meeting_url: string | null;
};

type StudentClass = {
  id: string;
  status: string | null;
  class: BookedClass | null;
};

type LessonProgress = {
  id: string;
  class_id: string;
  attendance_status: string;
  notes: string | null;
  homework: string | null;
  covered: string | null;
  revision: string | null;
  parent_note: string | null;
  updated_at: string | null;
  created_at: string | null;
  class: {
    id: string;
    title: string;
  } | null;
};

type StudentPayload = {
  learner: Learner;
  classes: StudentClass[];
  progress: LessonProgress[];
};

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
  if (lessonsCompleted >= 1) return 'Qur’an Starter';
  return 'New Learner';
}

export default function StudentAccessClient() {
  const [code, setCode] = useState('');
  const [student, setStudent] = useState<StudentPayload | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const progressByClass = useMemo(() => {
    const map = new Map<string, LessonProgress>();

    student?.progress.forEach((progress) => {
      if (!map.has(progress.class_id)) {
        map.set(progress.class_id, progress);
      }
    });

    return map;
  }, [student]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '');

    try {
      const response = await fetch('/api/student/access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: normalizedCode }),
      });

      const payload = (await response.json()) as StudentPayload & {
        error?: string;
      };

      if (!response.ok) {
        setStudent(null);
        setError(payload.error ?? 'We could not open that student page.');
        return;
      }

      setCode(normalizedCode);
      setStudent(payload);
    } catch {
      setStudent(null);
      setError('We could not open that student page. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const learner = student?.learner;
  const lessonsCompleted = learner?.lessons_completed ?? 0;

  return (
    <main className="min-h-[calc(100vh-73px)] bg-emerald-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="max-w-2xl space-y-2">
            <h1 className="text-3xl font-semibold text-gray-950">
              Student Access
            </h1>
            <p className="text-base leading-7 text-gray-600">
              Enter your student code to see your live Qur&apos;an classes and
              progress.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6 flex flex-col gap-3 sm:max-w-xl sm:flex-row"
          >
            <label className="flex-1">
              <span className="mb-1 block text-sm font-medium text-gray-900">
                Student access code
              </span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-lg font-semibold tracking-wide text-gray-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                maxLength={11}
                placeholder="Q7K9M2RA"
                autoComplete="off"
              />
            </label>
            <button
              disabled={isLoading}
              className="w-full rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 sm:mt-6 sm:w-auto"
            >
              {isLoading ? 'Checking...' : 'Continue'}
            </button>
          </form>

          {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
        </section>

        {learner && (
          <>
            <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700">
                    Assalamu alaikum
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-gray-950">
                    {learner.full_name}
                  </h2>
                  {learner.learning_goals && (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                      Goal: {learner.learning_goals}
                    </p>
                  )}
                </div>
                <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  My Badge: {badgeForLessons(lessonsCompleted, learner.current_badge)}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">My Qur&apos;an Level</p>
                  <p className="mt-2 font-semibold text-gray-950">
                    {learner.quran_level ?? 'Not set yet'}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Lessons Completed</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-950">
                    {lessonsCompleted}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">My Points</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-950">
                    {learner.points ?? 0}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-semibold text-gray-950">
                My Live Classes
              </h2>

              {student.classes.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                  No Live Classes are booked yet.
                </p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {student.classes.map((studentClass) => {
                    const bookedClass = studentClass.class;
                    const progress = bookedClass
                      ? progressByClass.get(bookedClass.id)
                      : undefined;

                    return (
                      <li
                        key={studentClass.id}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-950">
                              {bookedClass?.title ?? 'Qur’an class'}
                            </h3>
                            {bookedClass && (
                              <p className="mt-1 text-sm text-gray-600">
                                {formatDateTime(bookedClass.start_time)}
                                {bookedClass.duration_min
                                  ? ` - ${bookedClass.duration_min} min`
                                  : ''}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-700">
                              {bookedClass?.subject && (
                                <span className="rounded-full bg-white px-3 py-1">
                                  {bookedClass.subject}
                                </span>
                              )}
                              {bookedClass?.level && (
                                <span className="rounded-full bg-white px-3 py-1">
                                  {bookedClass.level}
                                </span>
                              )}
                              {bookedClass?.language && (
                                <span className="rounded-full bg-white px-3 py-1">
                                  {bookedClass.language}
                                </span>
                              )}
                              <span className="rounded-full bg-white px-3 py-1">
                                Status: {studentClass.status ?? 'booked'}
                              </span>
                            </div>
                          </div>

                          {bookedClass?.meeting_url ? (
                            <a
                              href={bookedClass.meeting_url}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-emerald-700 sm:w-auto"
                            >
                              Join Live Class
                            </a>
                          ) : (
                            <p className="text-sm font-medium text-gray-600">
                              Live link will be added before class.
                            </p>
                          )}
                        </div>

                        {progress && (
                          <div className="mt-4 space-y-2 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">
                            <p>Attendance: {progress.attendance_status}</p>
                            {(progress.covered ?? progress.notes) && (
                              <p>
                                What was covered:{' '}
                                {progress.covered ?? progress.notes}
                              </p>
                            )}
                            {(progress.revision ?? progress.homework) && (
                              <p>
                                What to Revise:{' '}
                                {progress.revision ?? progress.homework}
                              </p>
                            )}
                            {progress.parent_note && (
                              <p>Note for parent: {progress.parent_note}</p>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-semibold text-gray-950">
                What to Revise
              </h2>

              {student.progress.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                  Revision notes will appear after a lesson update.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {student.progress.slice(0, 5).map((progress) => (
                    <li
                      key={progress.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700"
                    >
                      <p className="font-semibold text-gray-950">
                        {progress.class?.title ?? 'Lesson update'}
                      </p>
                      {(progress.covered ?? progress.notes) && (
                        <p className="mt-2">
                          What was covered: {progress.covered ?? progress.notes}
                        </p>
                      )}
                      {(progress.revision ?? progress.homework) && (
                        <p className="mt-1">
                          What to Revise: {progress.revision ?? progress.homework}
                        </p>
                      )}
                      {progress.parent_note && (
                        <p className="mt-1">
                          Note for parent: {progress.parent_note}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
