import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export default async function ScholarOverview() {
  /* ① Verify scholar is signed in */
  const sb = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect('/login');

  /* ② Call internal API — same-origin, cookies sent automatically */
  const res = await fetch('/api/scholar/stats', {
    next: { revalidate: 60 }, // cache 1 min
  });

  const stats = await res.json();

  /* ③ Render metrics */
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-6 text-2xl font-semibold">Overview</h1>

      <ul className="space-y-4 text-center">
        <li className="rounded border p-4 shadow-sm">
          <p className="text-3xl font-bold">{stats.totalClasses}</p>
          <p className="text-sm text-gray-500">Total Classes</p>
        </li>
        <li className="rounded border p-4 shadow-sm">
          <p className="text-3xl font-bold">{stats.upcoming}</p>
          <p className="text-sm text-gray-500">Upcoming Classes</p>
        </li>
        <li className="rounded border p-4 shadow-sm">
          <p className="text-3xl font-bold">{stats.learners}</p>
          <p className="text-sm text-gray-500">Learners Booked</p>
        </li>
      </ul>
    </main>
  );
}
