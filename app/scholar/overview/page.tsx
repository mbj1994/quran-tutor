import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

type ProfileRole = {
  role: { code: string | null } | { code: string | null }[] | null;
};

function getRoleCode(profile: ProfileRole | null) {
  const role = Array.isArray(profile?.role) ? profile.role[0] : profile?.role;
  return role?.code ?? null;
}

export default async function ScholarOverview() {
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

  const { data: classes } = await sb
    .from('classes')
    .select('id, start_time')
    .eq('scholar_id', user.id);

  const totalClasses = classes?.length ?? 0;
  const upcoming =
    classes?.filter((classRow) => new Date(classRow.start_time) > new Date())
      .length ?? 0;
  const classIds = classes?.map((classRow) => classRow.id) ?? [];
  let learnerCount = 0;
  let progressUpdates = 0;

  if (classIds.length > 0) {
    const { count } = await sb
      .from('enrolments')
      .select('id', { count: 'exact', head: true })
      .in('class_id', classIds);

    learnerCount = count ?? 0;

    const { count: progressCount } = await sb
      .from('lesson_progress')
      .select('id', { count: 'exact', head: true })
      .in('class_id', classIds);

    progressUpdates = progressCount ?? 0;
  }

  const cards = [
    { label: 'Teaching Classes', value: totalClasses },
    { label: 'Upcoming Classes', value: upcoming },
    { label: 'Learners Enrolled', value: learnerCount },
    { label: 'Progress Updates', value: progressUpdates },
  ];

  return (
    <main className="mx-auto max-w-4xl bg-gray-50 p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-950">Scholar Home</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Manage your live Qur&apos;an classes, attendance, and learner
            progress.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/scholar/classes"
            className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
          >
            View teaching classes
          </Link>
          <Link
            href="/scholar/classes/new"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Create a class
          </Link>
        </div>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <li
            key={card.label}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-3xl font-semibold text-gray-950">{card.value}</p>
            <p className="mt-2 text-sm font-medium text-gray-600">
              {card.label}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
