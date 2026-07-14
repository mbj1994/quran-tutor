import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

const languages = ['English', 'Wolof', 'Mandinka', 'Fula', 'Arabic'] as const;
const quranLevels = [
  'Beginner Arabic letters',
  'Qaida / Noorani Qaida',
  'Qur’an reading beginner',
  'Qur’an reading intermediate',
  'Tajweed beginner',
  'Memorization beginner',
  'Memorization ongoing',
] as const;

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
  const quranLevel = String(formData.get('quran_level') ?? '').trim();
  const learningGoals = String(formData.get('learning_goals') ?? '').trim();
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
    quran_level: quranLevel || null,
    learning_goals: learningGoals || null,
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
    <main className="mx-auto max-w-xl bg-gray-50 p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-950">Add a child</h1>
          <p className="text-sm leading-6 text-gray-600">
            Create a learning profile so we can recommend the right Qur&apos;an classes.
          </p>
        </div>
        <Link href="/learners" className="text-sm font-medium text-emerald-700 underline">
          Back
        </Link>
      </div>

      <form
        action={createLearner}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-900">
            Child name
          </span>
          <input
            required
            name="full_name"
            className="w-full rounded-lg border border-gray-300 p-2 text-gray-950"
            placeholder="Child name"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-900">Age</span>
          <input
            name="age"
            type="number"
            min={0}
            className="w-full rounded-lg border border-gray-300 p-2 text-gray-950"
            placeholder="Optional"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Preferred language
          </span>
          <select
            name="preferred_language"
            className="w-full rounded-lg border border-gray-300 p-2 text-gray-950"
          >
            <option value="">No preference</option>
            {languages.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-900">
            Qur&apos;an level
          </span>
          <select
            name="quran_level"
            className="w-full rounded-lg border border-gray-300 p-2 text-gray-950"
          >
            <option value="">Not sure yet</option>
            {quranLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Choose the level that best describes the child today. It can be updated later.
          </p>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Learning goals
          </span>
          <textarea
            name="learning_goals"
            className="min-h-24 w-full rounded-lg border border-gray-300 p-2 text-gray-950"
            placeholder="What should the child work towards?"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Notes</span>
          <textarea
            name="notes"
            className="min-h-28 w-full rounded-lg border border-gray-300 p-2 text-gray-950"
            placeholder="Anything the scholar should know?"
          />
        </label>

        <button className="w-full rounded bg-emerald-600 py-2 text-white hover:bg-emerald-700">
          Save child
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </main>
  );
}
