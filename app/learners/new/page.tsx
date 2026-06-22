import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

const languages = ['English', 'Wolof', 'Mandinka', 'Fula', 'Arabic'] as const;

type NewLearnerPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

async function createLearner(formData: FormData) {
  'use server';

  const sb = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect('/login');

  const fullName = String(formData.get('full_name') ?? '').trim();
  const ageValue = String(formData.get('age') ?? '').trim();
  const preferredLanguage = String(
    formData.get('preferred_language') ?? ''
  ).trim();
  const notes = String(formData.get('notes') ?? '').trim();

  if (!fullName) {
    redirect('/learners/new?error=Full%20name%20is%20required.');
  }

  const age = ageValue ? Number(ageValue) : null;

  if (age !== null && (!Number.isInteger(age) || age < 0)) {
    redirect('/learners/new?error=Age%20must%20be%20a%20valid%20number.');
  }

  const { error } = await sb.from('learners').insert({
    parent_id: user.id,
    full_name: fullName,
    age,
    preferred_language: preferredLanguage || null,
    notes: notes || null,
  });

  if (error) {
    redirect(`/learners/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/learners');
}

export default async function NewLearnerPage({
  searchParams,
}: NewLearnerPageProps) {
  const sb = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect('/login');

  const params = await searchParams;
  const error = params?.error;

  return (
    <main className="mx-auto max-w-md p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Add Learner</h1>
        <Link href="/learners" className="text-sm text-emerald-700 underline">
          Back to learners
        </Link>
      </div>

      <form action={createLearner} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Full name</span>
          <input
            required
            name="full_name"
            className="w-full rounded border p-2"
            placeholder="Learner full name"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Age</span>
          <input
            name="age"
            type="number"
            min={0}
            className="w-full rounded border p-2"
            placeholder="Optional"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Preferred language
          </span>
          <select name="preferred_language" className="w-full rounded border p-2">
            <option value="">No preference</option>
            {languages.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Notes</span>
          <textarea
            name="notes"
            className="min-h-28 w-full rounded border p-2"
            placeholder="Optional"
          />
        </label>

        <button className="w-full rounded bg-emerald-600 py-2 text-white hover:bg-emerald-700">
          Save Learner
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </main>
  );
}
