import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

type RosterPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ClassRow = {
  id: string;
  scholar_id: string;
  title: string;
  start_time: string;
  duration_min: number;
};

type LearnerRow = {
  id: string;
  full_name: string;
  age: number | null;
  preferred_language: string | null;
};

type EnrolmentRow = {
  id: string;
  status: string | null;
  created_at: string | null;
  learner: LearnerRow | LearnerRow[] | null;
};

export default async function ScholarClassRosterPage({
  params,
}: RosterPageProps) {
  const { id } = await params;
  const sb = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect('/login');

  const { data: classRow, error: classError } = await sb
    .from('classes')
    .select('id, scholar_id, title, start_time, duration_min')
    .eq('id', id)
    .maybeSingle<ClassRow>();

  if (classError) {
    return <p className="p-4 text-red-600">{classError.message}</p>;
  }

  if (!classRow || classRow.scholar_id !== user.id) {
    return <p className="p-4 text-red-600">Access denied.</p>;
  }

  const { data, error } = await sb
    .from('enrolments')
    .select(
      `
        id,
        status,
        created_at,
        learner:learners!enrolments_learner_profile_id_fkey (
          id,
          full_name,
          age,
          preferred_language
        )
      `
    )
    .eq('class_id', classRow.id)
    .order('created_at', { ascending: true });

  if (error) {
    return <p className="p-4 text-red-600">{error.message}</p>;
  }

  const enrolments = (data ?? []) as EnrolmentRow[];

  return (
    <main className="mx-auto max-w-3xl p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{classRow.title}</h1>
          <p className="text-sm text-gray-500">
            {new Date(classRow.start_time).toLocaleString()} -{' '}
            {classRow.duration_min} min
          </p>
        </div>
        <Link
          href="/scholar/classes"
          className="text-sm text-emerald-700 underline"
        >
          Back to classes
        </Link>
      </div>

      <p className="mb-4 text-sm text-gray-600">
        Total enrolled: {enrolments.length}
      </p>

      {enrolments.length === 0 ? (
        <p>No learners booked yet.</p>
      ) : (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-3 font-medium">Learner</th>
                <th className="p-3 font-medium">Age</th>
                <th className="p-3 font-medium">Preferred language</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Booked</th>
              </tr>
            </thead>
            <tbody>
              {enrolments.map((enrolment) => {
                const learner = Array.isArray(enrolment.learner)
                  ? enrolment.learner[0]
                  : enrolment.learner;

                return (
                  <tr key={enrolment.id} className="border-t">
                    <td className="p-3">
                      {learner?.full_name ?? 'Unknown learner'}
                    </td>
                    <td className="p-3">{learner?.age ?? '-'}</td>
                    <td className="p-3">
                      {learner?.preferred_language ?? '-'}
                    </td>
                    <td className="p-3">{enrolment.status ?? '-'}</td>
                    <td className="p-3">
                      {enrolment.created_at
                        ? new Date(enrolment.created_at).toLocaleString()
                        : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
