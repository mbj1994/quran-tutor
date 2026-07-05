import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

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

  if (classIds.length > 0) {
    const { count } = await sb
      .from('enrolments')
      .select('id', { count: 'exact', head: true })
      .in('class_id', classIds);

    learnerCount = count ?? 0;
  }

  return (
    <main className="mx-auto max-w-md bg-gray-50 p-6">
      <h1 className="mb-6 text-2xl font-semibold text-gray-950">
        Scholar Overview
      </h1>

      <ul className="space-y-4 text-center">
        <li className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-3xl font-bold text-gray-950">{totalClasses}</p>
          <p className="text-sm text-gray-500">Total Classes</p>
        </li>
        <li className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-3xl font-bold text-gray-950">{upcoming}</p>
          <p className="text-sm text-gray-500">Upcoming Classes</p>
        </li>
        <li className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-3xl font-bold text-gray-950">{learnerCount}</p>
          <p className="text-sm text-gray-500">Learners Booked</p>
        </li>
      </ul>
    </main>
  );
}
