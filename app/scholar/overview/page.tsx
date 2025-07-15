import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic'; // always fresh

export default async function ScholarOverview() {
  /* ① wrap cookies() in a function */
  const sb = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect('/login');

  /* ② build a proper Cookie header from all cookies */
  const cookieHeader = cookies().toString();   // ✅ one-liner

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/scholar/stats`,
    {
      headers: { Cookie: cookieHeader },
      next: { revalidate: 60 },   // cache for 1 min
    }
  );

  const stats = await res.json();

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
