import Link from 'next/link';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import LogoutButton from './LogoutButton';

type NavLink = {
  href: string;
  label: string;
};

type ProfileRole = {
  role: { code: string | null } | { code: string | null }[] | null;
};

const publicLinks: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/classes', label: 'Browse Classes' },
  { href: '/login', label: 'Login' },
];

const parentLinks: NavLink[] = [
  { href: '/dashboard', label: 'Family Dashboard' },
  { href: '/learners', label: 'Children' },
  { href: '/classes', label: 'Browse Classes' },
  { href: '/my-classes', label: 'My Live Classes' },
  { href: '/subscription', label: 'Billing' },
];

const scholarLinks: NavLink[] = [
  { href: '/scholar/overview', label: 'Scholar Home' },
  { href: '/scholar/classes', label: 'Teaching Classes' },
];

function getRoleCode(profile: ProfileRole | null) {
  const role = Array.isArray(profile?.role) ? profile.role[0] : profile?.role;
  return role?.code ?? null;
}

export default async function SiteNav() {
  noStore();

  const sb = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await sb.auth.getUser();

  let links = publicLinks;
  let isLoggedIn = false;

  if (user) {
    isLoggedIn = true;
    links = parentLinks;

    const { data: profile } = await sb
      .from('profiles')
      .select('role:roles(code)')
      .eq('id', user.id)
      .maybeSingle<ProfileRole>();

    if (getRoleCode(profile) === 'scholar') {
      links = scholarLinks;
    }
  }

  return (
    <header className="border-b bg-white">
      <nav className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
        <Link href="/" className="text-lg font-semibold text-emerald-800">
          Quran Tutor
        </Link>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-gray-700 hover:text-emerald-700 hover:underline"
            >
              {link.label}
            </Link>
          ))}
          {isLoggedIn && <LogoutButton />}
        </div>
      </nav>
    </header>
  );
}
