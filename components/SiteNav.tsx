import Link from 'next/link';

const links = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Parent Dashboard' },
  { href: '/classes', label: 'Browse Classes' },
  { href: '/my-classes', label: 'My Classes' },
  { href: '/learners', label: 'My Learners' },
  { href: '/subscription', label: 'Subscription' },
  { href: '/payments', label: 'Payments' },
  { href: '/scholar/classes', label: 'Scholar Classes' },
  { href: '/scholar/overview', label: 'Scholar Overview' },
  { href: '/login', label: 'Login' },
];

export default function SiteNav() {
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
        </div>
      </nav>
    </header>
  );
}
