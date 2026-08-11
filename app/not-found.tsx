import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[55vh] max-w-lg items-center p-4 sm:p-6">
      <section className="w-full rounded-2xl border border-emerald-100 bg-white p-6 text-center shadow-sm shadow-emerald-950/5 sm:p-8">
        <p className="text-sm font-semibold text-emerald-700">Page not found</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-950">
          We could not find that page.
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          The page may have moved, or the link may no longer be available.
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
