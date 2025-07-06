'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';

export default function ClientBookButton({
  classId,
  disabled,
}: {
  classId: string;
  disabled?: boolean;
}) {
  const sb = supabaseBrowser();
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'saving' | 'done'>('idle');

  async function book() {
    setStatus('saving');

    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      alert('Please log in first.');      // shouldn’t happen, but safe-guard
      return setStatus('idle');
    }

    const { error } = await sb
      .from('enrolments')
      .insert({ class_id: classId, learner_id: user.id });

    if (error) {
      alert(error.message);
      return setStatus('idle');
    }

    // booking OK → jump to My Classes
    router.push('/my-classes');
  }

  return (
    <button
      onClick={book}
      disabled={disabled || status === 'saving'}
      className="rounded bg-emerald-600 px-3 py-1 text-white disabled:opacity-50"
    >
      {status === 'saving' ? 'Booking…' : 'Book'}
    </button>
  );
}
