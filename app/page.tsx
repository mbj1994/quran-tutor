import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-96px)] max-w-5xl flex-col justify-center gap-8 bg-gray-50 p-6">
      <section className="space-y-5">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Live Qur&apos;an learning for Gambian diaspora families
        </p>
        <h1 className="max-w-3xl text-4xl font-bold text-gray-950 sm:text-5xl">
          Quran Tutor
        </h1>
        <p className="max-w-3xl text-lg leading-8 text-gray-700">
          Parents can create child profiles, book live Qur&apos;an classes with
          approved Scholar / Ustass teachers, and follow progress and learning rewards in
          one simple family dashboard.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white shadow-sm hover:bg-emerald-700"
        >
          Get started
        </Link>
        <Link
          href="/classes"
          className="rounded-lg border border-emerald-600 bg-white px-5 py-3 font-medium text-emerald-700 hover:bg-emerald-50"
        >
          Browse Classes
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-medium text-gray-800 hover:bg-gray-100"
        >
          Login
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['Approved Scholar / Ustass teachers', 'Classes are taught by approved teachers managed by the platform team.'],
          ['Parent-managed profiles', 'Add each child with their age, language, level, and learning goals.'],
          ['Live Classes', 'Browse available Qur’an classes and book the right place for your child.'],
          ['Child progress', 'See attendance, revision notes, Qur’an level, and what to practise next.'],
          ['Learning rewards', 'Children build points and badges as they complete lessons.'],
        ].map(([title, body]) => (
          <article
            key={title}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <h2 className="font-semibold text-gray-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">{body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
