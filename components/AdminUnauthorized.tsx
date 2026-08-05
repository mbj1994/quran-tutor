import Link from 'next/link';

type AdminUnauthorizedProps = {
  signedIn: boolean;
};

export default function AdminUnauthorized({ signedIn }: AdminUnauthorizedProps) {
  return (
    <main className="mx-auto max-w-xl p-4 sm:p-6">
      <section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-amber-700">Private admin area</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-950">
          You do not have access to this page.
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          The Admin Control Center is available only to the Quran Tutor platform team.
        </p>
        <Link
          href={signedIn ? '/dashboard' : '/'}
          className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {signedIn ? 'Back to dashboard' : 'Back to home'}
        </Link>
      </section>
    </main>
  );
}
