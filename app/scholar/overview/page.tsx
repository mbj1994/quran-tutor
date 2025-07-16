import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export default async function ScholarOverview() {
  /* ① Auth check */
  const sb = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login');

  /* ② Build absolute URL for internal API */
  const origin =
    process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  /* Include cookies so /api/scholar/stats can read session */
  const res = await fetch(`${origin}/api/scholar/stats`, {
    headers: { Cookie: cookies().toString() },
    next: { revalidate: 60 },
  });

  const stats = await res.json();

  /* ③ Render cards */
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
