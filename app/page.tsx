import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-96px)] max-w-3xl flex-col justify-center gap-6 p-6">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Quran Tutor</h1>
        <p className="text-lg text-gray-700">
          Online Quran learning for diaspora children, taught by Gambian and
          partner scholars. Parents can add learners, book classes, and follow
          lesson progress in one place.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700"
        >
          Get Started
        </Link>
        <Link
          href="/classes"
          className="rounded border border-emerald-600 px-5 py-3 font-medium text-emerald-700 hover:bg-emerald-50"
        >
          Browse Classes
        </Link>
        <Link
          href="/dashboard"
          className="rounded border px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
        >
          Parent Dashboard
        </Link>
      </div>
    </main>
  );
}
