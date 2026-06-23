'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';

type Learner = {
  id: string;
  full_name: string;
};

export default function ClientBookButton({
  classId,
  disabled,
  hasActiveSubscription,
  learners,
}: {
  classId: string;
  disabled?: boolean;
  hasActiveSubscription: boolean;
  learners: Learner[];
}) {
  const sb = supabaseBrowser();
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'saving' | 'done'>('idle');
  const [selectedLearnerId, setSelectedLearnerId] = useState('');

  async function book() {
    if (!hasActiveSubscription) {
      alert('Please subscribe before booking a class.');
      router.push('/payments');
      return;
    }

    if (!selectedLearnerId) {
      alert('Please select a learner first.');
      return;
    }

    setStatus('saving');

    const {
      data: { user },
    } = await sb.auth.getUser();

    if (!user) {
      alert('Please log in first.');
      return setStatus('idle');
    }

    const { error } = await sb
      .from('enrolments')
      .insert({
        class_id: classId,
        learner_id: user.id,
        learner_profile_id: selectedLearnerId,
      });

    if (error) {
      alert(error.message);
      return setStatus('idle');
    }

    router.push('/my-classes');
  }

  if (hasActiveSubscription && learners.length === 0) {
    return (
      <Link
        href="/learners/new"
        className="rounded bg-emerald-600 px-3 py-1 text-white hover:bg-emerald-700"
      >
        Add Learner First
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {hasActiveSubscription && (
        <select
          value={selectedLearnerId}
          onChange={(event) => setSelectedLearnerId(event.target.value)}
          disabled={disabled || status === 'saving'}
          className="rounded border px-2 py-1 text-sm"
        >
          <option value="">Select learner</option>
          {learners.map((learner) => (
            <option key={learner.id} value={learner.id}>
              {learner.full_name}
            </option>
          ))}
        </select>
      )}

      <button
        onClick={book}
        disabled={disabled || status === 'saving'}
        className="rounded bg-emerald-600 px-3 py-1 text-white disabled:opacity-50"
      >
        {status === 'saving'
          ? 'Booking...'
          : hasActiveSubscription
            ? 'Book'
            : 'Subscribe to Book'}
      </button>
    </div>
  );
}
