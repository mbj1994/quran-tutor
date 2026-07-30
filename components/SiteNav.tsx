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
    <header className="sticky top-0 z-50 border-b border-emerald-100/80 bg-white/90 shadow-sm backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-col gap-3 px-3 py-3 sm:px-6 md:flex-row md:items-center md:justify-between">
        <Link
          href="/"
          className="flex w-fit items-center gap-2 text-lg font-bold leading-tight tracking-tight text-emerald-950"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-emerald-700 text-sm text-white shadow-sm">
            QT
          </span>
          Qur’an Tutor
        </Link>

        <div className="grid w-full grid-cols-2 gap-1 text-sm sm:flex sm:flex-wrap sm:items-center md:w-auto md:justify-end">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-11 min-w-0 items-center justify-center rounded-xl px-2 py-2 text-center font-medium leading-5 text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 sm:justify-start sm:px-3 sm:text-left"
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
