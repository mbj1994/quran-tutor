import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic'; // show new rows immediately

export default async function ScholarClasses() {
  const sb = createServerComponentClient({ cookies });

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return <p className="p-4">Please log in.</p>;

  const { data: classes, error } = await sb
    .from('classes')
    .select('*')
    .order('start_time', { ascending: true });

  if (error) return <p className="p-4 text-red-600">{error.message}</p>;

  return (
    <main className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Classes</h1>
        <Link
          href="/scholar/classes/new"
          className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
        >
          + New
        </Link>
      </div>

      {classes?.length === 0 && <p>No classes yet.</p>}

      <ul className="space-y-3">
        {classes?.map((c) => (
          <li
            key={c.id}
            className="rounded border p-3 shadow-sm hover:bg-gray-50"
          >
            <div className="font-medium">{c.title}</div>
            <div className="text-sm text-gray-500">
              {new Date(c.start_time).toLocaleString()} · {c.duration_min} min
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
