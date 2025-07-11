// app/scholar/overview/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export default async function ScholarOverview() {
  const sb = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect('/login');

  // ── Build internal API URL ────────────────────────────────────────────
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  // ── Forward the auth cookie to the API route ─────────────────────────
  const res = await fetch(`${base}/api/scholar/stats`, {
    headers: { Cookie: cookies().toString() }, // ← simple & typesafe
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Stats API error: ${await res.text()}`);
  }

  const stats: {
    totalClasses: number;
    upcoming: number;
    learners: number;
  } = await res.json();

  // ── UI ───────────────────────────────────────────────────────────────
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
