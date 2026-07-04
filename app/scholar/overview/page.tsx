import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export default async function ScholarOverview() {
  const sb = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect('/login');

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
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-6 text-2xl font-semibold">Overview</h1>

      <ul className="space-y-4 text-center">
        <li className="rounded border p-4 shadow-sm">
          <p className="text-3xl font-bold">{totalClasses}</p>
          <p className="text-sm text-gray-500">Total Classes</p>
        </li>
        <li className="rounded border p-4 shadow-sm">
          <p className="text-3xl font-bold">{upcoming}</p>
          <p className="text-sm text-gray-500">Upcoming Classes</p>
        </li>
        <li className="rounded border p-4 shadow-sm">
          <p className="text-3xl font-bold">{learnerCount}</p>
          <p className="text-sm text-gray-500">Learners Booked</p>
        </li>
      </ul>
    </main>
  );
}
