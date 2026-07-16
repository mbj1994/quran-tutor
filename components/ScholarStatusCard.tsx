import Link from 'next/link';
import {
  normalizeScholarStatus,
  type ScholarStatus,
} from '@/lib/scholarApproval';

type ScholarStatusCardProps = {
  status?: string | null;
};

const statusCopy: Record<ScholarStatus, { title: string; body: string }> = {
  pending: {
    title: 'Your scholar account is pending approval.',
    body: 'The platform team will contact you after review.',
  },
  approved: {
    title: 'Your scholar account is approved.',
    body: 'You can manage your teaching classes.',
  },
  suspended: {
    title: 'Your scholar account is currently not active. Please contact the platform team.',
    body: 'Teaching access is paused for this account.',
  },
};

export default function ScholarStatusCard({ status }: ScholarStatusCardProps) {
  const normalizedStatus = normalizeScholarStatus(status);
  const copy = statusCopy[normalizedStatus];

  return (
    <main className="mx-auto max-w-md bg-gray-50 p-4 sm:p-6">
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Scholar access
        </p>
        <h1 className="mt-2 text-xl font-semibold leading-7 text-gray-950">
          {copy.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">{copy.body}</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block rounded-lg border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
        >
          Go to dashboard
        </Link>
      </section>
    </main>
  );
}
