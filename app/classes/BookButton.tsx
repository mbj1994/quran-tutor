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
  subscriptionState,
  learners,
  bookedLearnerIds,
}: {
  classId: string;
  disabled?: boolean;
  subscriptionState: 'active' | 'pending' | 'inactive';
  learners: Learner[];
  bookedLearnerIds: string[];
}) {
  const sb = supabaseBrowser();
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'saving' | 'done'>('idle');
  const [selectedLearnerId, setSelectedLearnerId] = useState('');
  const [message, setMessage] = useState('');
  const selectedLearnerIsBooked = bookedLearnerIds.includes(selectedLearnerId);

  async function book() {
    const {
      data: { user },
    } = await sb.auth.getUser();

    if (!user) {
      alert('Please log in to book a live class.');
      router.push('/login');
      return;
    }

    if (subscriptionState !== 'active') {
      const message =
        subscriptionState === 'pending'
          ? 'Your bank payment is still processing. Booking will be available once Stripe confirms it.'
          : 'Please start a family subscription before booking a class.';
      alert(message);
      router.push('/subscription');
      return;
    }

    if (!selectedLearnerId) {
      setMessage('Please choose which learner is joining this class.');
      return;
    }

    if (selectedLearnerIsBooked) {
      setMessage('This child is already booked for this class.');
      return;
    }

    setMessage('');
    setStatus('saving');

    const { error } = await sb
      .from('enrolments')
      .insert({
        class_id: classId,
        learner_id: user.id,
        learner_profile_id: selectedLearnerId,
      });

    if (error) {
      const isDuplicateBooking =
        error.code === '23505' &&
        `${error.message} ${error.details ?? ''}`.includes(
          'enrolments_class_learner_profile_unique'
        );

      setMessage(
        isDuplicateBooking
          ? 'This child is already booked for this class.'
          : 'We could not book this class right now. Please try again.'
      );
      return setStatus('idle');
    }

    router.push('/my-classes');
  }

  if (subscriptionState === 'active' && learners.length === 0) {
    return (
      <Link
        href="/learners/new"
        className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700 sm:w-auto"
      >
        Add child first
      </Link>
    );
  }

  if (subscriptionState === 'pending') {
    return (
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
        <span className="text-sm font-medium text-amber-800">
          Bank payment processing. Booking unlocks after Stripe confirms it.
        </span>
        <Link
          href="/subscription"
          className="w-full rounded-lg border border-amber-500 px-3 py-2 text-center text-sm font-medium text-amber-900 hover:bg-amber-50 sm:w-auto"
        >
          View Billing
        </Link>
      </div>
    );
  }

  if (subscriptionState === 'inactive') {
    return (
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
        <span className="text-sm font-medium text-gray-700">
          Subscribe to book live Qur&apos;an classes.
        </span>
        <Link
          href="/subscription"
          className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700 sm:w-auto"
        >
          Go to Billing
        </Link>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto">
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <select
        value={selectedLearnerId}
        onChange={(event) => {
          const learnerId = event.target.value;
          setSelectedLearnerId(learnerId);
          setMessage(
            bookedLearnerIds.includes(learnerId)
              ? 'This child is already booked for this class.'
              : ''
          );
        }}
        disabled={disabled || status === 'saving'}
        className="w-full rounded-lg border px-2 py-2 text-sm sm:w-auto"
      >
        <option value="">Choose child</option>
        {learners.map((learner) => (
          <option key={learner.id} value={learner.id}>
            {learner.full_name}
            {bookedLearnerIds.includes(learner.id) ? ' — Already booked' : ''}
          </option>
        ))}
      </select>

      <button
        onClick={book}
        disabled={disabled || status === 'saving' || selectedLearnerIsBooked}
        className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 sm:w-auto"
      >
        {selectedLearnerIsBooked
          ? 'Already booked'
          : status === 'saving'
            ? 'Booking...'
            : 'Book class'}
      </button>
      </div>
      {message && (
        <p role="status" className="text-sm font-medium text-amber-700">
          {message}
        </p>
      )}
    </div>
  );
}
