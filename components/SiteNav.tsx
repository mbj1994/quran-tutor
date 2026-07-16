import Link from 'next/link';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import LogoutButton from './LogoutButton';
import { getRoleCode, type ProfileRole } from '@/lib/roles';

type NavLink = {
  href: string;
  label: string;
};

const publicLinks: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/classes', label: 'Browse Classes' },
  { href: '/student', label: 'Student Access' },
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

const adminLinks: NavLink[] = [
  { href: '/admin', label: 'Admin' },
  { href: '/admin/scholars', label: 'Scholar Approvals' },
];

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

    const roleCode = getRoleCode(profile);

    if (roleCode === 'admin') {
      links = adminLinks;
    }

    if (roleCode === 'scholar') {
      links = scholarLinks;
    }
  }

  return (
    <header className="border-b bg-white">
      <nav className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/"
          className="w-fit text-lg font-semibold leading-tight text-emerald-800"
        >
          Quran Tutor
        </Link>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm sm:justify-end">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-1 py-1 leading-5 text-gray-700 hover:text-emerald-700 hover:underline"
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
