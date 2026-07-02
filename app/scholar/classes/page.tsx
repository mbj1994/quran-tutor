import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

export default async function ScholarClasses() {
  const sb = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) return <p className="p-4">Please log in.</p>;

  const { data: classes, error } = await sb
    .from('classes')
    .select('*')
    .eq('scholar_id', user.id)
    .order('start_time', { ascending: true });

  if (error) return <p className="p-4 text-red-600">{error.message}</p>;

  return (
    <main className="mx-auto max-w-3xl bg-gray-50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-950">My Classes</h1>
        <Link
          href="/scholar/classes/new"
          className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
        >
          + New
        </Link>
      </div>

      {classes?.length === 0 && <p className="text-gray-600">No classes yet.</p>}

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
              {new Date(classRow.start_time).toLocaleString()} -{' '}
              {classRow.duration_min} min
            </div>
            {classRow.meeting_url && (
              <a
                href={classRow.meeting_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Join Live Class
              </a>
            )}
            <div className="mt-3 flex gap-4">
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
