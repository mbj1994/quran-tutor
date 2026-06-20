import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export default async function ScholarOverview() {
  /* ① Get current user */
  const sb = createServerComponentClient({ cookies });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');

  /* ② Fetch this scholar’s classes */
  const { data: classes } = await sb
    .from('classes')
    .select('id, start_time')
    .eq('scholar_id', user.id);

  const totalClasses = classes?.length ?? 0;
  const upcoming = classes?.filter(
    c => new Date(c.start_time) > new Date()
  ).length ?? 0;

  /* ③ Count learners across those classes */
  const { count: learnerCount } = await sb
    .from('enrolments')
    .select('id', { count: 'exact', head: true })
    .in('class_id', classes?.map(c => c.id) as string[] ?? []);

  /* ④ Render cards */
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
          <p className="text-3xl font-bold">{learnerCount ?? 0}</p>
          <p className="text-sm text-gray-500">Learners Booked</p>
        </li>
      </ul>
    </main>
  );
}
