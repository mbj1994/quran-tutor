import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

type BookedClass = {
  id: string;
  title: string;
  start_time: string;
  duration_min: number;
};

type Learner = {
  id: string;
  full_name: string;
};

type Enrolment = {
  id: string;
  status: string | null;
  class: BookedClass | BookedClass[] | null;
  learner: Learner | Learner[] | null;
};

export default async function MyClasses() {
  const sb = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect('/login');

  const { data, error } = await sb
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
        ),
        learner:learners!enrolments_learner_profile_id_fkey (
          id,
          full_name
        )
      `
    )
    .eq('learner_id', user.id)
    .order('start_time', {
      foreignTable: 'classes',
      ascending: true,
    });

  if (error) {
    return <p className="p-4 text-red-600">{error.message}</p>;
  }

  const enrolments = (data ?? []) as Enrolment[];

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-semibold">My Booked Classes</h1>

      {enrolments.length === 0 && (
        <p>No bookings yet. When you book a class for a learner, it will appear here.</p>
      )}

      <ul className="space-y-4">
        {enrolments.map((enrolment) => {
          const bookedClass = Array.isArray(enrolment.class)
            ? enrolment.class[0]
            : enrolment.class;
          const learner = Array.isArray(enrolment.learner)
            ? enrolment.learner[0]
            : enrolment.learner;

          return (
            <li key={enrolment.id} className="rounded border p-4 shadow-sm">
              <div className="font-medium">
                {bookedClass ? bookedClass.title : 'Unknown class'}
              </div>
              <div className="text-sm text-gray-500">
                {bookedClass
                  ? `${new Date(bookedClass.start_time).toLocaleString()} - ${bookedClass.duration_min} min`
                  : '-'}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Learner: {learner?.full_name ?? 'Unknown learner'}
              </div>
              {enrolment.status && (
                <div className="mt-1 text-xs text-gray-400">
                  Status: {enrolment.status}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
