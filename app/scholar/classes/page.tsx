import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

type ProfileRole = {
  role: { code: string | null } | { code: string | null }[] | null;
};

function getRoleCode(profile: ProfileRole | null) {
  const role = Array.isArray(profile?.role) ? profile.role[0] : profile?.role;
  return role?.code ?? null;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function ScholarClasses() {
  const sb = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await sb
    .from('profiles')
    .select('role:roles(code)')
    .eq('id', user.id)
    .maybeSingle<ProfileRole>();

  if (getRoleCode(profile) !== 'scholar') redirect('/dashboard');

  const { data: classes, error } = await sb
    .from('classes')
    .select('*')
    .eq('scholar_id', user.id)
    .order('start_time', { ascending: true });

  if (error) return <p className="p-4 text-red-600">{error.message}</p>;

  return (
    <main className="mx-auto max-w-3xl bg-gray-50 p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-950">
            Scholar Classes
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage live classes, rosters, and revision notes.
          </p>
        </div>
        <Link
          href="/scholar/classes/new"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
        >
          New class
        </Link>
      </div>

      {classes?.length === 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-950">
            No scholar classes yet
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Create your first live class so parents can book a place for their
            learners.
          </p>
          <Link
            href="/scholar/classes/new"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Create class
          </Link>
        </section>
      )}

      <ul className="space-y-3">
        {classes?.map((classRow) => (
          <li
            key={classRow.id}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="text-lg font-semibold text-gray-950">
              {classRow.title}
            </div>
            <div className="mt-1 space-y-1 text-sm text-gray-600">
              {classRow.subject && <p>Subject: {classRow.subject}</p>}
              {classRow.level && <p>Level: {classRow.level}</p>}
              {classRow.language && <p>Language: {classRow.language}</p>}
              {classRow.description && <p>{classRow.description}</p>}
            </div>
            <div className="mt-2 text-sm text-gray-500">
              {formatDateTime(classRow.start_time)} - {classRow.duration_min} min
            </div>
            <div className="mt-3">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                  classRow.meeting_url
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {classRow.meeting_url ? 'Live link ready' : 'No live link yet'}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-4">
              <Link
                href={`/scholar/classes/${classRow.id}/edit`}
                className="text-sm text-emerald-700 underline"
              >
                Edit
              </Link>
              <Link
                href={`/scholar/classes/${classRow.id}/roster`}
                className="text-sm text-emerald-700 underline"
              >
                Roster
              </Link>
              <Link
                href={`/scholar/classes/${classRow.id}/progress`}
                className="text-sm text-emerald-700 underline"
              >
                Progress
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
