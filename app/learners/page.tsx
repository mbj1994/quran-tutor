import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  displayBadge,
  getMilestoneProgress,
  getNextMilestone,
} from '@/lib/gamification';

export const dynamic = 'force-dynamic';

type Learner = {
  id: string;
  full_name: string;
  age: number | null;
  preferred_language: string | null;
  quran_level: string | null;
  learning_goals: string | null;
  notes: string | null;
  student_access_code: string | null;
  points: number | null;
  lessons_completed: number | null;
  current_badge: string | null;
};

export default async function LearnersPage() {
  const sb = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect('/login');

  const { data, error } = await sb
    .from('learners')
    .select(
      'id, full_name, age, preferred_language, quran_level, learning_goals, notes, student_access_code, points, lessons_completed, current_badge'
    )
    .eq('parent_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return <p className="p-4 text-red-600">{error.message}</p>;
  }

  const learners = (data ?? []) as Learner[];

  return (
    <main className="mx-auto max-w-4xl bg-gray-50 p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-950">Children</h1>
          <p className="max-w-2xl text-sm leading-6 text-gray-600">
            Add and manage the children learning Qur&apos;an with your family account.
          </p>
        </div>
        <Link
          href="/learners/new"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
        >
          Add child
        </Link>
      </div>

      {learners.length === 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-950">
            You have not added any children yet.
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Add your child&apos;s profile so you can choose their
            Qur&apos;an level, book Live Classes, and follow child progress.
          </p>
          <Link
            href="/learners/new"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Add a child
          </Link>
        </section>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {learners.map((learner) => {
          const lessonsCompleted = learner.lessons_completed ?? 0;
          const badge = displayBadge(learner.current_badge, lessonsCompleted);
          const nextMilestone = getNextMilestone(lessonsCompleted);
          const milestoneProgress = getMilestoneProgress(lessonsCompleted);

          return (
          <li
            key={learner.id}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="text-lg font-semibold text-gray-950">
              {learner.full_name}
            </div>

            <div className="mt-3 space-y-1 text-sm text-gray-600">
              {learner.age !== null && <p>Age: {learner.age}</p>}
              {learner.preferred_language && (
                <p>Preferred language: {learner.preferred_language}</p>
              )}
              {learner.quran_level && (
                <p>Qur&apos;an level: {learner.quran_level}</p>
              )}
              {learner.learning_goals && (
                <p>Learning goals: {learner.learning_goals}</p>
              )}
              {learner.notes && <p>Notes: {learner.notes}</p>}
            </div>

            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <p className="font-medium text-gray-950">Progress summary</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1">
                  Lessons: {lessonsCompleted}
                </span>
                <span className="rounded-full bg-white px-3 py-1">
                  Points: {learner.points ?? 0}
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                  {badge}
                </span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between gap-3 text-xs text-gray-600">
                  <span>Next milestone</span>
                  <span>
                    {lessonsCompleted}/{milestoneProgress.target}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${milestoneProgress.percent}%` }}
                  />
                </div>
                <p className="mt-2 leading-6 text-gray-700">{nextMilestone}</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-950">
              <p className="font-medium">Student access code</p>
              <p className="mt-2 font-mono text-xl font-semibold tracking-wide">
                {learner.student_access_code ?? 'Code pending'}
              </p>
              <p className="mt-2 leading-6 text-emerald-900">
                Use this code on the student page so your child can view only
                their own Live Classes and progress.
              </p>
              <Link
                href="/student"
                className="mt-3 inline-block rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Open Student Page
              </Link>
            </div>
          </li>
          );
        })}
      </ul>
    </main>
  );
}
