import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import AdminUnauthorized from '@/components/AdminUnauthorized';
import { getRoleCode, type ProfileRole } from '@/lib/roles';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { displayBadge } from '@/lib/gamification';
import FriendlyError from '@/components/FriendlyError';

export const dynamic = 'force-dynamic';

type Profile = ProfileRole & {
  id: string;
  full_name: string | null;
  scholar_status: string | null;
  created_at: string | null;
};

type AuthUser = { id: string; email: string | null };

type ClassRow = {
  id: string;
  scholar_id: string;
  title: string;
  start_time: string;
  duration_min: number | null;
  level: string | null;
  language: string | null;
};

type Learner = {
  id: string;
  parent_id: string;
  full_name: string;
  quran_level: string | null;
  lessons_completed: number | null;
  points: number | null;
  current_badge: string | null;
  created_at: string | null;
};

type Enrolment = {
  id: string;
  class_id: string;
  learner_profile_id: string | null;
  learner_id: string;
  status: string | null;
  created_at: string | null;
};

function formatDate(value: string | null, includeTime = false) {
  if (!value) return 'Not available';
  const date = new Date(value);
  return includeTime
    ? date.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : date.toLocaleDateString('en-US', { dateStyle: 'medium' });
}

async function listAuthUsers() {
  const admin = createSupabaseAdminClient();
  const users: AuthUser[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error(error.message);
    users.push(...data.users.map((user) => ({ id: user.id, email: user.email ?? null })));
    if (data.users.length < 100) return users;
    page += 1;
  }
}

export default async function AdminPage() {
  const sb = createServerComponentClient({ cookies });
  const { data: { user } } = await sb.auth.getUser();
  const { data: currentProfile } = user
    ? await sb
        .from('profiles')
        .select('role:roles(code)')
        .eq('id', user.id)
        .maybeSingle<ProfileRole>()
    : { data: null };

  if (!user || getRoleCode(currentProfile) !== 'admin') {
    return <AdminUnauthorized signedIn={Boolean(user)} />;
  }

  const admin = createSupabaseAdminClient();
  const [profilesResult, classesResult, learnersResult, enrolmentsResult, users] =
    await Promise.all([
      admin
        .from('profiles')
        .select('id, full_name, scholar_status, created_at, role:roles(code)')
        .order('created_at', { ascending: false }),
      admin
        .from('classes')
        .select('id, scholar_id, title, start_time, duration_min, level, language')
        .order('start_time', { ascending: false }),
      admin
        .from('learners')
        .select('id, parent_id, full_name, quran_level, lessons_completed, points, current_badge, created_at')
        .order('created_at', { ascending: false }),
      admin
        .from('enrolments')
        .select('id, class_id, learner_profile_id, learner_id, status, created_at')
        .order('created_at', { ascending: false }),
      listAuthUsers(),
    ]);

  const queryError =
    profilesResult.error ?? classesResult.error ?? learnersResult.error ?? enrolmentsResult.error;
  if (queryError) return <FriendlyError />;

  const profiles = (profilesResult.data ?? []) as Profile[];
  const classes = (classesResult.data ?? []) as ClassRow[];
  const learners = (learnersResult.data ?? []) as Learner[];
  const enrolments = (enrolmentsResult.data ?? []) as Enrolment[];
  const parents = profiles.filter((profile) => getRoleCode(profile) === 'parent');
  const scholars = profiles.filter((profile) => getRoleCode(profile) === 'scholar');
  const emailById = new Map(users.map((authUser) => [authUser.id, authUser.email]));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const classById = new Map(classes.map((classRow) => [classRow.id, classRow]));
  const learnerById = new Map(learners.map((learner) => [learner.id, learner]));
  const enrolmentCountByClass = new Map<string, number>();
  const classCountByScholar = new Map<string, number>();

  for (const classRow of classes) {
    classCountByScholar.set(classRow.scholar_id, (classCountByScholar.get(classRow.scholar_id) ?? 0) + 1);
  }
  for (const enrolment of enrolments) {
    enrolmentCountByClass.set(enrolment.class_id, (enrolmentCountByClass.get(enrolment.class_id) ?? 0) + 1);
  }

  const now = Date.now();
  const upcomingClasses = classes
    .filter((classRow) => new Date(classRow.start_time).getTime() >= now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const profileLabel = (id: string) =>
    profileById.get(id)?.full_name ?? emailById.get(id) ?? 'Name unavailable';

  return (
    <main className="mx-auto max-w-7xl space-y-7 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Platform overview</p>
          <h1 className="mt-1 text-3xl font-semibold text-gray-950">Admin Control Center</h1>
        </div>
        <Link href="/admin/scholars" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          Manage scholar access
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          ['Parents', parents.length],
          ['Scholars', scholars.length],
          ['Learners', learners.length],
          ['Classes', classes.length],
          ['Bookings', enrolments.length],
          ['Upcoming', upcomingClasses.length],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-gray-950">{value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-4 sm:p-5">
          <div><h2 className="text-lg font-semibold text-gray-950">Scholars</h2><p className="mt-1 text-sm text-gray-500">Teaching accounts and class activity</p></div>
          <Link href="/admin/scholars" className="text-sm font-medium text-emerald-700 hover:underline">View all</Link>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {scholars.slice(0, 6).map((scholar) => (
            <article key={scholar.id} className="rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-950">{scholar.full_name ?? emailById.get(scholar.id) ?? 'Scholar'}</h3>
              <p className="mt-1 truncate text-sm text-gray-500">{emailById.get(scholar.id) ?? 'Email unavailable'}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-gray-100 px-3 py-1">{classCountByScholar.get(scholar.id) ?? 0} classes</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 capitalize text-emerald-700">{scholar.scholar_status ?? 'pending'}</span>
              </div>
            </article>
          ))}
          {scholars.length === 0 && <p className="text-sm text-gray-500">No scholar accounts yet.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4 sm:p-5"><h2 className="text-lg font-semibold text-gray-950">Classes</h2><p className="mt-1 text-sm text-gray-500">Schedule and enrolment overview</p></div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600"><tr>{['Class', 'Scholar', 'Level / language', 'Schedule', 'Learners'].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3 font-medium">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {classes.slice(0, 10).map((classRow) => (
                <tr key={classRow.id}>
                  <td className="px-4 py-3 font-medium text-gray-950">{classRow.title}</td>
                  <td className="px-4 py-3 text-gray-600">{profileLabel(classRow.scholar_id)}</td>
                  <td className="px-4 py-3 text-gray-600">{[classRow.level, classRow.language].filter(Boolean).join(' · ') || 'Not set'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDate(classRow.start_time, true)}</td>
                  <td className="px-4 py-3 text-gray-600">{enrolmentCountByClass.get(classRow.id) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {classes.length === 0 && <p className="p-4 text-sm text-gray-500">No classes yet.</p>}
        </div>
      </section>

      <div className="grid gap-7 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4 sm:p-5"><h2 className="text-lg font-semibold text-gray-950">Recent families and learners</h2></div>
          <ul className="divide-y divide-gray-100">
            {learners.slice(0, 8).map((learner) => (
              <li key={learner.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><p className="font-medium text-gray-950">{learner.full_name}</p><p className="mt-1 text-sm text-gray-500">Parent: {profileLabel(learner.parent_id)} · {emailById.get(learner.parent_id) ?? 'Email unavailable'}</p></div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{displayBadge(learner.current_badge, learner.lessons_completed ?? 0)}</span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{learner.quran_level ?? 'Level not set'} · {learner.lessons_completed ?? 0} lessons · {learner.points ?? 0} points</p>
              </li>
            ))}
            {learners.length === 0 && <li className="p-4 text-sm text-gray-500">No learners yet.</li>}
          </ul>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4 sm:p-5"><h2 className="text-lg font-semibold text-gray-950">Recent bookings</h2></div>
          <ul className="divide-y divide-gray-100">
            {enrolments.slice(0, 8).map((enrolment) => {
              const learner = enrolment.learner_profile_id ? learnerById.get(enrolment.learner_profile_id) : null;
              const classRow = classById.get(enrolment.class_id);
              const parentId = learner?.parent_id ?? enrolment.learner_id;
              return (
                <li key={enrolment.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium text-gray-950">{learner?.full_name ?? 'Learner unavailable'}</p><p className="mt-1 text-sm text-gray-600">{classRow?.title ?? 'Class unavailable'} · {classRow ? profileLabel(classRow.scholar_id) : 'Scholar unavailable'}</p></div><span className="rounded-full bg-gray-100 px-3 py-1 text-xs capitalize text-gray-700">{enrolment.status ?? 'booked'}</span></div>
                  <p className="mt-2 text-xs text-gray-500">Parent: {profileLabel(parentId)} · Booked {formatDate(enrolment.created_at)}</p>
                </li>
              );
            })}
            {enrolments.length === 0 && <li className="p-4 text-sm text-gray-500">No bookings yet.</li>}
          </ul>
        </section>
      </div>
    </main>
  );
}
