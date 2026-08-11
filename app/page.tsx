import Link from 'next/link';
import InstallApp from '@/components/InstallApp';

const highlights = [
  ['☾', 'Live Qur’an Classes', 'Small, welcoming lessons that fit family life.'],
  ['✦', 'Trusted Scholar / Ustass', 'Approved teachers who guide children with care.'],
  ['↗', 'Learning Progress', 'See lessons, revision notes, points, and milestones.'],
  ['⌁', 'Student Access', 'A simple code gives each child their own learning view.'],
  ['♡', 'Support a Child', 'Donations can help more families access Qur’an learning.'],
];

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl overflow-hidden px-4 py-8 sm:px-6 sm:py-14">
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-200/70 bg-emerald-950 px-6 py-10 text-white shadow-xl shadow-emerald-950/10 sm:px-10 sm:py-16 lg:px-16">
        <div className="absolute -right-16 -top-16 size-64 rounded-full border-[36px] border-white/5" />
        <div className="absolute -bottom-20 right-1/4 size-48 rounded-full bg-amber-300/10 blur-2xl" />
        <div className="relative max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">
            Live Qur’an learning for every family
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Help your child grow with the Qur’an.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-emerald-50/85 sm:text-lg">
            Trusted live teaching and clear progress, all in one welcoming family dashboard.
          </p>
          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
            <Link href="/login" className="flex min-h-12 items-center justify-center rounded-xl bg-amber-300 px-6 py-3 font-semibold text-emerald-950 shadow-sm hover:bg-amber-200">
              Get Started
            </Link>
            <Link href="/classes" className="flex min-h-12 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-6 py-3 font-semibold text-white hover:bg-white/15">
              Browse Classes
            </Link>
            <Link href="/student" className="flex min-h-12 items-center justify-center rounded-xl px-5 py-3 font-medium text-emerald-100 hover:bg-white/10 hover:text-white">
              Student Access
            </Link>
          </div>
        </div>
      </section>

      <InstallApp />

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {highlights.map(([icon, title, body]) => (
          <article
            key={title}
            className="min-w-0 rounded-2xl border border-emerald-100 bg-white/90 p-5 shadow-sm shadow-emerald-950/5 hover:border-emerald-200 hover:shadow-md"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-lg font-semibold text-emerald-700">
              {icon}
            </span>
            <h2 className="mt-4 font-semibold text-gray-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">{body}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 flex flex-col gap-4 rounded-2xl border border-amber-200/70 bg-amber-50/80 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-emerald-950">Learning rooted in faith and family</h2>
          <p className="mt-1 text-sm text-gray-600">Made for Gambian diaspora children, wherever home may be.</p>
        </div>
        <Link href="/donation" className="shrink-0 font-semibold text-emerald-800 hover:text-emerald-950">
          Make a Donation →
        </Link>
      </section>

      <p className="mt-6 text-center text-xs leading-5 text-gray-500">
        Pilot version for testing with selected families and scholars.
      </p>
    </main>
  );
}
