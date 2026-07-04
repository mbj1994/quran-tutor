import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

const subjects = [
  'Arabic letters',
  'Qaida / Noorani Qaida',
  'Quran reading',
  'Tajweed',
  'Memorization',
  'Revision',
  'Islamic basics',
] as const;

const levels = [
  'Beginner Arabic letters',
  'Qaida / Noorani Qaida',
  'Quran reading beginner',
  'Quran reading intermediate',
  'Tajweed beginner',
  'Memorization beginner',
  'Memorization ongoing',
] as const;

const languages = ['English', 'Mandinka', 'Wolof', 'Fula', 'Arabic'] as const;

type EditClassPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

type ClassRow = {
  id: string;
  scholar_id: string;
  title: string;
  start_time: string;
  duration_min: number;
  capacity: number;
  subject: string | null;
  level: string | null;
  language: string | null;
  description: string | null;
  meeting_url: string | null;
};

function looksLikeUrl(value: string) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function formatDateTimeLocal(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

async function updateClass(formData: FormData) {
  'use server';

  const sb = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect('/login');

  const classId = String(formData.get('class_id') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const startTime = String(formData.get('start_time') ?? '').trim();
  const duration = Number(formData.get('duration_min') ?? 60);
  const capacity = Number(formData.get('capacity') ?? 20);
  const subject = String(formData.get('subject') ?? '').trim();
  const level = String(formData.get('level') ?? '').trim();
  const language = String(formData.get('language') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const meetingUrl = String(formData.get('meeting_url') ?? '').trim();

  if (!classId) redirect('/scholar/classes');

  if (!title) {
    redirect(
      `/scholar/classes/${classId}/edit?error=${encodeURIComponent(
        'Class title is required.'
      )}`
    );
  }

  const parsedStartTime = new Date(startTime);

  if (!startTime || Number.isNaN(parsedStartTime.getTime())) {
    redirect(
      `/scholar/classes/${classId}/edit?error=${encodeURIComponent(
        'Please choose a valid class date and time.'
      )}`
    );
  }

  if (!Number.isInteger(duration) || duration < 15 || duration > 180) {
    redirect(
      `/scholar/classes/${classId}/edit?error=${encodeURIComponent(
        'Duration must be between 15 and 180 minutes.'
      )}`
    );
  }

  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) {
    redirect(
      `/scholar/classes/${classId}/edit?error=${encodeURIComponent(
        'Capacity must be between 1 and 100 learners.'
      )}`
    );
  }

  if (!looksLikeUrl(meetingUrl)) {
    redirect(
      `/scholar/classes/${classId}/edit?error=${encodeURIComponent(
        'Please enter a full video meeting URL, starting with https://.'
      )}`
    );
  }

  const { error } = await sb
    .from('classes')
    .update({
      title,
      start_time: parsedStartTime.toISOString(),
      duration_min: duration,
      capacity,
      subject: subject || null,
      level: level || null,
      language: language || null,
      description: description || null,
      meeting_url: meetingUrl || null,
    })
    .eq('id', classId)
    .eq('scholar_id', user.id);

  if (error) {
    redirect(
      `/scholar/classes/${classId}/edit?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidatePath('/scholar/classes');
  revalidatePath(`/scholar/classes/${classId}/edit`);
  redirect('/scholar/classes');
}

export default async function EditClassPage({
  params,
  searchParams,
}: EditClassPageProps) {
  const { id } = await params;
  const sb = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect('/login');

  const { data: classRow, error: classError } = await sb
    .from('classes')
    .select(
      'id, scholar_id, title, start_time, duration_min, capacity, subject, level, language, description, meeting_url'
    )
    .eq('id', id)
    .maybeSingle<ClassRow>();

  if (classError) {
    return <p className="p-4 text-red-600">{classError.message}</p>;
  }

  if (!classRow || classRow.scholar_id !== user.id) {
    return <p className="p-4 text-red-600">Access denied.</p>;
  }

  const paramsValue = await searchParams;

  return (
    <main className="mx-auto max-w-md bg-gray-50 p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-950">Edit Class</h1>
          <p className="text-sm text-gray-600">{classRow.title}</p>
        </div>
        <Link
          href="/scholar/classes"
          className="text-sm text-emerald-700 underline"
        >
          Back to classes
        </Link>
      </div>

      <form
        action={updateClass}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
      >
        <input type="hidden" name="class_id" value={classRow.id} />

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Title</span>
          <input
            required
            name="title"
            defaultValue={classRow.title}
            className="w-full rounded border p-2"
            placeholder="Surah Al-Fatihah"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Class date and time
          </span>
          <input
            required
            name="start_time"
            type="datetime-local"
            defaultValue={formatDateTimeLocal(classRow.start_time)}
            className="w-full rounded border p-2"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              Duration minutes
            </span>
            <input
              name="duration_min"
              type="number"
              min={15}
              max={180}
              step={15}
              defaultValue={classRow.duration_min}
              className="w-full rounded border p-2"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Capacity</span>
            <input
              name="capacity"
              type="number"
              min={1}
              max={100}
              defaultValue={classRow.capacity}
              className="w-full rounded border p-2"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Subject</span>
          <select
            name="subject"
            defaultValue={classRow.subject ?? ''}
            className="w-full rounded border p-2"
          >
            <option value="">No subject</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Level</span>
          <select
            name="level"
            defaultValue={classRow.level ?? ''}
            className="w-full rounded border p-2"
          >
            <option value="">No level</option>
            {levels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Language</span>
          <select
            name="language"
            defaultValue={classRow.language ?? ''}
            className="w-full rounded border p-2"
          >
            <option value="">No language</option>
            {languages.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Description</span>
          <textarea
            name="description"
            defaultValue={classRow.description ?? ''}
            className="min-h-28 w-full rounded border p-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Live class link / video meeting URL
          </span>
          <input
            name="meeting_url"
            type="url"
            defaultValue={classRow.meeting_url ?? ''}
            className="w-full rounded border p-2"
            placeholder="https://..."
          />
          <span className="mt-1 block text-xs text-gray-500">
            Use Zoom, Google Meet, or Jitsi for now. Built-in video can be added later.
          </span>
        </label>

        <button className="w-full rounded bg-emerald-600 py-2 text-white hover:bg-emerald-700">
          Save Class
        </button>

        {paramsValue?.error && (
          <p className="text-sm text-red-600">{paramsValue.error}</p>
        )}
      </form>
    </main>
  );
}
