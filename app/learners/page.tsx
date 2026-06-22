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
    .select('id, full_name, age, preferred_language, notes')
    .eq('parent_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return <p className="p-4 text-red-600">{error.message}</p>;
  }

  const learners = (data ?? []) as Learner[];

  return (
    <main className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">My Learners</h1>
        <Link
          href="/learners/new"
          className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
        >
          Add Learner
        </Link>
      </div>

      {learners.length === 0 && <p>No learners added yet.</p>}

      <ul className="space-y-4">
        {learners.map((learner) => (
          <li key={learner.id} className="rounded border p-4 shadow-sm">
            <div className="font-medium">{learner.full_name}</div>

            <div className="mt-2 space-y-1 text-sm text-gray-600">
              {learner.age !== null && <p>Age: {learner.age}</p>}
              {learner.preferred_language && (
                <p>Preferred language: {learner.preferred_language}</p>
              )}
              {learner.notes && <p>Notes: {learner.notes}</p>}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
