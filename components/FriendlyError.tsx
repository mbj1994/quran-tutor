import Link from 'next/link';

export default function FriendlyError() {
  return (
    <main className="mx-auto max-w-lg p-4 sm:p-6">
      <section className="rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm shadow-emerald-950/5 sm:p-8">
        <h1 className="text-xl font-semibold text-gray-950">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Something went wrong. Please try again.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Return home
        </Link>
      </section>
    </main>
  );
}
