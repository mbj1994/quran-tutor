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
      <nav className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4 md:flex-row md:items-center md:justify-between">
        <Link
          href="/"
          className="w-fit text-lg font-semibold leading-tight text-emerald-800"
        >
          Quran Tutor
        </Link>

        <div className="grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap sm:items-center md:justify-end">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-11 items-center rounded-lg px-3 py-2 leading-5 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 sm:min-h-10"
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
