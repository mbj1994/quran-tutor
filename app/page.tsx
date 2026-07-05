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
          Book live Qur&apos;an classes for your child with approved
          Scholars/Ustass. Parents can manage learner profiles, follow child
          progress, and support steady subscription-based learning in one calm
          dashboard.
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
          href="/login"
          className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-medium text-gray-800 hover:bg-gray-100"
        >
          Login
        </Link>
        <Link
          href="/classes"
          className="rounded-lg border border-emerald-600 bg-white px-5 py-3 font-medium text-emerald-700 hover:bg-emerald-50"
        >
          Browse Classes
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['Approved Scholars/Ustass', 'Classes are taught by approved teachers managed by the platform team.'],
          ['Family dashboard', 'Add children, book live classes, and keep the family schedule easy to follow.'],
          ['Child progress', "See Qur'an level, revision notes, attendance, and what to practise next."],
          ['Learning rewards', 'Children build points and badges as they complete lessons.'],
          ['Live class links', 'Join through simple video meeting links for each booked class.'],
          ['Subscription-supported', 'Family subscriptions help sustain consistent learning and scholar support.'],
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
