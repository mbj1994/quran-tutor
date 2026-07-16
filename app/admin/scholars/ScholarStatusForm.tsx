'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { scholarStatuses, type ScholarStatus } from '@/lib/scholarApproval';

type ScholarStatusFormProps = {
  profileId: string;
  currentStatus: ScholarStatus;
};

type StatusResponse = {
  ok: boolean;
  error?: string;
};

export default function ScholarStatusForm({
  profileId,
  currentStatus,
}: ScholarStatusFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ScholarStatus>(currentStatus);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function updateStatus(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/scholars/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          scholar_status: status,
        }),
      });
      const data = (await response.json()) as StatusResponse;

      if (!response.ok || !data.ok) {
        setMessage(data.error ?? 'Could not update status.');
        return;
      }

      setMessage('Saved.');
      router.refresh();
    } catch {
      setMessage('Could not update status.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={updateStatus} className="flex flex-col gap-2 sm:flex-row">
      <select
        value={status}
        onChange={(event) => setStatus(event.target.value as ScholarStatus)}
        disabled={loading}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-950"
      >
        {scholarStatuses.map((statusOption) => (
          <option key={statusOption} value={statusOption}>
            {statusOption}
          </option>
        ))}
      </select>
      <button
        disabled={loading}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save'}
      </button>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </form>
  );
}
