import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

type Learner = {
  id: string;
  full_name: string;
  age: number | null;
  preferred_language: string | null;
  quran_level: string | null;
  learning_goals: string | null;
  notes: string | null;
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
      'id, full_name, age, preferred_language, quran_level, learning_goals, notes'
    )
    .eq('parent_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return <p className="p-4 text-red-600">{error.message}</p>;
  }

  const learners = (data ?? []) as Learner[];

  return (
    <main className="mx-auto max-w-3xl bg-gray-50 p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-950">Learners</h1>
        <Link
          href="/learners/new"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
        >
          Add learner
        </Link>
      </div>

      {learners.length === 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-950">No learners yet</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Add your child&apos;s learner profile so you can choose their
            Qur&apos;an level, book live classes, and follow child progress.
          </p>
          <Link
            href="/learners/new"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Add first learner
          </Link>
        </section>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {learners.map((learner) => (
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
          </li>
        ))}
      </ul>
    </main>
  );
}
