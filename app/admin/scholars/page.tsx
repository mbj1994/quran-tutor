import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { getRoleCode, type ProfileRole } from '@/lib/roles';
import {
  normalizeScholarStatus,
  type ScholarStatus,
} from '@/lib/scholarApproval';
import ScholarStatusForm from './ScholarStatusForm';

export const dynamic = 'force-dynamic';

type ScholarProfile = ProfileRole & {
  id: string;
  created_at: string | null;
  app_language: string | null;
  scholar_status: string | null;
};

type UserEmail = {
  id: string;
  email: string | null;
};

async function requireAdmin() {
  const sb = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await sb
    .from('profiles')
    .select('role:roles(code)')
    .eq('id', user.id)
    .maybeSingle<ProfileRole>();

  if (getRoleCode(profile) !== 'admin') redirect('/dashboard');
}

function statusBadgeClass(status: ScholarStatus) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700';
  if (status === 'suspended') return 'bg-red-50 text-red-700';
  return 'bg-amber-50 text-amber-700';
}

function formatDate(value: string | null) {
  if (!value) return '-';

  return new Date(value).toLocaleDateString('en-US', {
    dateStyle: 'medium',
  });
}

async function listAuthUserEmails() {
  const supabaseAdmin = createSupabaseAdminClient();
  const users: UserEmail[] = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) throw new Error(error.message);

    users.push(
      ...data.users.map((user) => ({
        id: user.id,
        email: user.email ?? null,
      }))
    );

    if (data.users.length < 100) break;
    page += 1;
  }

  return users;
}

export default async function AdminScholarsPage() {
  await requireAdmin();

  const supabaseAdmin = createSupabaseAdminClient();
  const [{ data: profiles, error }, users] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, created_at, app_language, scholar_status, role:roles(code)')
      .order('created_at', { ascending: false }),
    listAuthUserEmails(),
  ]);

  if (error) {
    return <p className="p-4 text-red-600">{error.message}</p>;
  }

  const emailByUserId = new Map(users.map((user) => [user.id, user.email]));
  const scholars = ((profiles ?? []) as ScholarProfile[]).filter(
    (profile) => getRoleCode(profile) === 'scholar'
  );

  return (
    <main className="mx-auto max-w-6xl bg-gray-50 p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-950">
            Scholar approvals
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Review scholar profiles and manage teaching access.
          </p>
        </div>
        <Link href="/admin" className="text-sm text-emerald-700 underline">
          Back to admin
        </Link>
      </div>

      {scholars.length === 0 ? (
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-950">No scholar accounts yet.</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Scholar signups will appear here for review.
          </p>
        </section>
      ) : (
        <ul className="space-y-4">
          {scholars.map((profile) => {
            const status = normalizeScholarStatus(profile.scholar_status);

            return (
              <li
                key={profile.id}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-950">
                      {emailByUserId.get(profile.id) ?? 'Email unavailable'}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-700">
                      <span className="rounded-full bg-gray-100 px-3 py-1">
                        Role: scholar
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 font-medium capitalize ${statusBadgeClass(
                          status
                        )}`}
                      >
                        {status}
                      </span>
                      <span className="rounded-full bg-gray-100 px-3 py-1">
                        Created: {formatDate(profile.created_at)}
                      </span>
                      <span className="rounded-full bg-gray-100 px-3 py-1">
                        App language: {profile.app_language ?? '-'}
                      </span>
                    </div>
                  </div>
                  <ScholarStatusForm
                    profileId={profile.id}
                    currentStatus={status}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
