import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import ClientBookButton from './BookButton';

export const dynamic = 'force-dynamic';

export default async function ClassesPage() {
  const sb = createServerComponentClient({ cookies });

  const { data: classes } = await sb
    .from('classes')
    .select('id,title,start_time,duration_min,capacity, enrolments(count)')
    .order('start_time', { ascending: true });

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-semibold">Available Classes</h1>

      <ul className="space-y-4">
        {classes?.map((c) => {
          const booked = c.enrolments[0]?.count ?? 0;
          const spots = c.capacity - booked;

          return (
            <li key={c.id} className="rounded border p-4 shadow-sm">
              <div className="font-medium">{c.title}</div>
              <div className="text-sm text-gray-500">
                {new Date(c.start_time).toLocaleString()} · {c.duration_min} min
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm">
                  {spots > 0 ? `${spots} spots left` : 'Full'}
                </span>
                <ClientBookButton
                  classId={c.id}
                  disabled={spots === 0}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
