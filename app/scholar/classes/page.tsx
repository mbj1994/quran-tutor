import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

type ProfileRole = {
  role: { code: string | null } | { code: string | null }[] | null;
};

type ClassRow = {
  id: string;
  title: string;
  subject: string | null;
  level: string | null;
  language: string | null;
  description: string | null;
  start_time: string;
  duration_min: number;
  capacity: number;
  meeting_url: string | null;
  enrolments: { count: number }[];
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
    .select(
      'id,title,subject,level,language,description,start_time,duration_min,capacity,meeting_url,enrolments(count)'
    )
    .eq('scholar_id', user.id)
    .order('start_time', { ascending: true });

  if (error) return <p className="p-4 text-red-600">{error.message}</p>;

  const teachingClasses = (classes ?? []) as ClassRow[];

  return (
    <main className="mx-auto max-w-4xl bg-gray-50 p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-950">
            Teaching Classes
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Create and manage the live Qur&apos;an classes assigned to you.
          </p>
        </div>
        <Link
          href="/scholar/classes/new"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Create a class
        </Link>
      </div>

      {teachingClasses.length === 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-950">
            You have not created any teaching classes yet.
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Create your first live class so parents can book a place for their
            children.
          </p>
          <Link
            href="/scholar/classes/new"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Create a class
          </Link>
        </section>
      )}

      <ul className="space-y-4">
        {teachingClasses.map((classRow) => (
          <li
            key={classRow.id}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-950">
                  {classRow.title}
                </h2>
                <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-700">
                  {classRow.subject && (
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      Subject: {classRow.subject}
                    </span>
                  )}
                  {classRow.level && (
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      Level: {classRow.level}
                    </span>
                  )}
                  {classRow.language && (
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      Language: {classRow.language}
                    </span>
                  )}
                </div>
              </div>
              <span
                className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium ${
                  classRow.meeting_url
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {classRow.meeting_url ? 'Live link ready' : 'No live link yet'}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-sm text-gray-600">
              {classRow.description && <p>{classRow.description}</p>}
              <p>
                {formatDateTime(classRow.start_time)} -{' '}
                {classRow.duration_min} min
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-700">
              <span className="rounded-full bg-gray-100 px-3 py-1">
                Capacity: {classRow.capacity}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1">
                Enrolled: {classRow.enrolments[0]?.count ?? 0}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/scholar/classes/${classRow.id}/edit`}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Edit
              </Link>
              <Link
                href={`/scholar/classes/${classRow.id}/roster`}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Roster
              </Link>
              <Link
                href={`/scholar/classes/${classRow.id}/progress`}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
