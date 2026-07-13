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
    const {
      data: { user },
    } = await sb.auth.getUser();

    if (!user) {
      alert('Please log in to book a live class.');
      router.push('/login');
      return;
    }

    if (!hasActiveSubscription) {
      alert('Please start a family subscription before booking a class.');
      router.push('/subscription');
      return;
    }

    if (!selectedLearnerId) {
      alert('Please choose which learner is joining this class.');
      return;
    }

    setStatus('saving');

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
        className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Add child first
      </Link>
    );
  }

  if (!hasActiveSubscription) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">
          Subscribe to book live Qur&apos;an classes.
        </span>
        <Link
          href="/subscription"
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Go to Billing
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={selectedLearnerId}
        onChange={(event) => setSelectedLearnerId(event.target.value)}
        disabled={disabled || status === 'saving'}
        className="rounded-lg border px-2 py-2 text-sm"
      >
        <option value="">Choose child</option>
        {learners.map((learner) => (
          <option key={learner.id} value={learner.id}>
            {learner.full_name}
          </option>
        ))}
      </select>

      <button
        onClick={book}
        disabled={disabled || status === 'saving'}
        className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {status === 'saving' ? 'Booking...' : 'Book class'}
      </button>
    </div>
  );
}
