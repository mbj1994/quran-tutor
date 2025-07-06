import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

export default async function MyClasses() {
  const sb = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login');

  // ── SELECT with explicit alias ───────────────────────────────────
  const { data: enrolments, error } = await sb
    .from('enrolments')
    .select(
      `
        id,
        status,
        class:classes (
          id,
          title,
          start_time,
          duration_min
        )
      `
    )
    .eq('learner_id', user.id)
    .order('start_time', {
      foreignTable: 'classes',
      ascending: true,
    });

  if (error)
    return <p className="p-4 text-red-600">{error.message}</p>;

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-semibold">
        My Booked Classes
      </h1>

      {enrolments?.length === 0 && <p>No bookings yet.</p>}

      <ul className="space-y-4">
        {enrolments?.map((e) => (
          <li
            key={e.id}
            className="rounded border p-4 shadow-sm"
          >
            <div className="font-medium">
              {e.class?.title ?? 'Unknown class'}
            </div>
            <div className="text-sm text-gray-500">
              {e.class
                ? `${new Date(
                    e.class.start_time
                  ).toLocaleString()} · ${
                    e.class.duration_min
                  } min`
                : '—'}
            </div>
            <div className="mt-1 text-xs text-gray-400">
              Status: {e.status}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
