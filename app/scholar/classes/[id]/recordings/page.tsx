import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import ScholarStatusCard from '@/components/ScholarStatusCard';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getRoleCode, type ProfileRole as BaseProfileRole } from '@/lib/roles';
import { isApprovedScholar } from '@/lib/scholarApproval';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    saved?: string;
    removed?: string;
    error?: string;
  }>;
};

type ProfileRole = BaseProfileRole & {
  scholar_status: string | null;
};

type ClassRow = {
  id: string;
  scholar_id: string;
  title: string;
  start_time: string;
};

type RecordingRow = {
  id: string;
  title: string;
  recording_url: string;
  notes: string | null;
  source: string;
  created_at: string;
};

function isPrivateRecordingUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function recordingsPath(classId: string, query = '') {
  return `/scholar/classes/${classId}/recordings${query}`;
}

async function addRecording(formData: FormData) {
  'use server';

  const sb = await createServerSupabaseClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect('/login');

  const classId = String(formData.get('class_id') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const recordingUrl = String(formData.get('recording_url') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();

  if (!classId) redirect('/scholar/classes');

  const { data: profile } = await sb
    .from('profiles')
    .select('scholar_status, role:roles(code)')
    .eq('id', user.id)
    .maybeSingle<ProfileRole>();

  if (!isApprovedScholar(profile)) redirect('/scholar/classes');

  const { data: classRow } = await sb
    .from('classes')
    .select('id, scholar_id')
    .eq('id', classId)
    .maybeSingle<{ id: string; scholar_id: string }>();

  if (!classRow || classRow.scholar_id !== user.id) {
    redirect('/scholar/classes');
  }

  if (!title || title.length > 120 || notes.length > 1000) {
    redirect(recordingsPath(classId, '?error=details'));
  }

  if (!isPrivateRecordingUrl(recordingUrl)) {
    redirect(recordingsPath(classId, '?error=url'));
  }

  const { error } = await sb.from('class_recordings').insert({
    class_id: classId,
    created_by: user.id,
    title,
    recording_url: recordingUrl,
    source: 'external',
    visibility: 'class',
    notes: notes || null,
  });

  if (error) {
    console.error('[class-recordings] Could not add recording', {
      classId,
      userId: user.id,
      error,
    });
    redirect(recordingsPath(classId, '?error=save'));
  }

  revalidatePath(recordingsPath(classId));
  revalidatePath('/my-classes');
  redirect(recordingsPath(classId, '?saved=1'));
}

async function removeRecording(formData: FormData) {
  'use server';

  const sb = await createServerSupabaseClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect('/login');

  const classId = String(formData.get('class_id') ?? '');
  const recordingId = String(formData.get('recording_id') ?? '');

  if (!classId || !recordingId) redirect('/scholar/classes');

  const { data: profile } = await sb
    .from('profiles')
    .select('scholar_status, role:roles(code)')
    .eq('id', user.id)
    .maybeSingle<ProfileRole>();

  if (!isApprovedScholar(profile)) redirect('/scholar/classes');

  const { data: classRow } = await sb
    .from('classes')
    .select('id, scholar_id')
    .eq('id', classId)
    .maybeSingle<{ id: string; scholar_id: string }>();

  if (!classRow || classRow.scholar_id !== user.id) {
    redirect('/scholar/classes');
  }

  const { error } = await sb
    .from('class_recordings')
    .delete()
    .eq('id', recordingId)
    .eq('class_id', classId);

  if (error) {
    console.error('[class-recordings] Could not remove recording', {
      classId,
      recordingId,
      userId: user.id,
      error,
    });
    redirect(recordingsPath(classId, '?error=remove'));
  }

  revalidatePath(recordingsPath(classId));
  revalidatePath('/my-classes');
  redirect(recordingsPath(classId, '?removed=1'));
}

export default async function ScholarClassRecordingsPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const notices = await searchParams;
  const sb = await createServerSupabaseClient();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await sb
    .from('profiles')
    .select('scholar_status, role:roles(code)')
    .eq('id', user.id)
    .maybeSingle<ProfileRole>();

  if (getRoleCode(profile) !== 'scholar') redirect('/dashboard');
  if (!isApprovedScholar(profile)) {
    return <ScholarStatusCard status={profile?.scholar_status} />;
  }

  const { data: classRow, error: classError } = await sb
    .from('classes')
    .select('id, scholar_id, title, start_time')
    .eq('id', id)
    .maybeSingle<ClassRow>();

  if (classError || !classRow || classRow.scholar_id !== user.id) {
    return (
      <main className="mx-auto max-w-md p-4 sm:p-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm shadow-emerald-950/5">
          <h1 className="font-semibold text-gray-950">Scholar access needed</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Lesson recordings are only available to the Scholar/Ustass assigned
            to this class.
          </p>
          <Link
            href="/scholar/classes"
            className="mt-4 inline-flex rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Back to Teaching Classes
          </Link>
        </section>
      </main>
    );
  }

  const { data, error: recordingsError } = await sb
    .from('class_recordings')
    .select('id, title, recording_url, notes, source, created_at')
    .eq('class_id', classRow.id)
    .order('created_at', { ascending: false });
  const recordings = (data ?? []) as RecordingRow[];

  const errorMessage =
    notices?.error === 'url'
      ? 'Enter a complete recording link beginning with http:// or https://.'
      : notices?.error === 'details'
        ? 'Add a title and keep the recording details within the allowed length.'
        : notices?.error === 'remove'
          ? 'We could not remove that recording right now. Please try again.'
          : notices?.error === 'save'
            ? 'We could not add that recording right now. Please try again.'
            : null;

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">
            Lesson Recordings
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-950">
            {classRow.title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Add a private recording link for families to use for lesson review.
          </p>
        </div>
        <Link href="/scholar/classes" className="text-sm text-emerald-700 underline">
          Back to Teaching Classes
        </Link>
      </div>

      {(notices?.saved || notices?.removed) && (
        <p
          role="status"
          className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900"
        >
          {notices.saved
            ? 'Class recording added successfully.'
            : 'Class recording removed.'}
        </p>
      )}
      {errorMessage && (
        <p
          role="alert"
          className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800"
        >
          {errorMessage}
        </p>
      )}
      {recordingsError && (
        <p
          role="alert"
          className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900"
        >
          Lesson recordings are not available yet. Please try again after the
          recording setup is complete.
        </p>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm shadow-emerald-950/5 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-950">Add Recording</h2>
        <p className="mt-1 text-sm leading-6 text-gray-600">
          Use a private Daily, Google Drive, YouTube unlisted, or other lesson
          recording link. No video file is uploaded to Quran Tutor.
        </p>
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Recording should only be used for lesson review and child learning
          support.
        </p>

        <form action={addRecording} className="mt-5 space-y-4">
          <input type="hidden" name="class_id" value={classRow.id} />
          <label className="block">
            <span className="text-sm font-medium text-gray-800">
              Recording title
            </span>
            <input
              name="title"
              required
              maxLength={120}
              placeholder="Lesson recording"
              className="mt-1 w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-800">
              Recording URL
            </span>
            <input
              name="recording_url"
              type="url"
              required
              placeholder="https://..."
              className="mt-1 w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-800">
              Notes (optional)
            </span>
            <textarea
              name="notes"
              maxLength={1000}
              rows={3}
              placeholder="What this recording covers"
              className="mt-1 w-full rounded-2xl border border-gray-300 px-4 py-3 text-gray-950 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <button className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700 sm:w-auto">
            Add Recording
          </button>
        </form>
        {/* TODO: Add explicit parent recording consent when a consent field or workflow is introduced. */}
      </section>

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm shadow-emerald-950/5 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-950">
          Class Recordings
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Private recordings for lesson review
        </p>

        {!recordingsError && recordings.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
            No class recordings have been added yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {recordings.map((recording) => (
              <li
                key={recording.id}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-950">
                      {recording.title}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Added {new Date(recording.created_at).toLocaleDateString('en-US')}
                    </p>
                    {recording.notes && (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                        {recording.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={recording.recording_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Watch Recording
                    </a>
                    <form action={removeRecording}>
                      <input type="hidden" name="class_id" value={classRow.id} />
                      <input
                        type="hidden"
                        name="recording_id"
                        value={recording.id}
                      />
                      <button className="inline-flex min-h-11 items-center rounded-2xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
