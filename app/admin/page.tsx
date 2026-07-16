import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { getRoleCode, type ProfileRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

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

const cards = [
  {
    title: 'Scholar approvals',
    body: 'Review scholar accounts and update teaching access.',
    href: '/admin/scholars',
    active: true,
  },
  {
    title: 'Families',
    body: 'Family management foundation for a later phase.',
    href: null,
    active: false,
  },
  {
    title: 'Classes',
    body: 'Class setup overview for a later phase.',
    href: null,
    active: false,
  },
];

export default async function AdminPage() {
  await requireAdmin();

  return (
    <main className="mx-auto max-w-5xl bg-gray-50 p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-950">Admin</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Manage scholar approvals and platform setup.
        </p>
      </div>

      <ul className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <li
            key={card.title}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          >
            <h2 className="font-semibold text-gray-950">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">{card.body}</p>
            {card.href ? (
              <Link
                href={card.href}
                className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Open
              </Link>
            ) : (
              <span className="mt-4 inline-block rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-500">
                Not active yet
              </span>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
