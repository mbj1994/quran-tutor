'use client';

import Link from 'next/link';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[55vh] max-w-lg items-center p-4 sm:p-6">
      <section className="w-full rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm shadow-emerald-950/5 sm:p-8">
        <p className="text-sm font-semibold text-red-700">Unable to continue</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-950">
          Something went wrong. Please try again.
        </h1>
        <div className="mt-5 grid gap-3 sm:flex sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="min-h-11 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
