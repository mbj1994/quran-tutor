'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';

export default function NewClassPage() {
  const sb = supabaseBrowser();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await sb.from('classes').insert({
      title,
      start_time: new Date(start).toISOString(),
      duration_min: duration,
    });

    setLoading(false);
    if (error) return setMsg(error.message);

    router.replace('/scholar/classes');
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mb-4 text-2xl font-semibold">Create a Class</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          required
          className="w-full rounded border p-2"
          placeholder="Title e.g., Surah Al-Fātiḥah"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          required
          type="datetime-local"
          className="w-full rounded border p-2"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />

        <input
          type="number"
          min={15}
          max={180}
          step={15}
          className="w-full rounded border p-2"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />

        <button
          disabled={loading}
          className="w-full rounded bg-emerald-600 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save'}
        </button>

        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </form>
    </main>
  );
}
