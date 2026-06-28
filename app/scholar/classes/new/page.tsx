'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';

const subjects = [
  'Arabic letters',
  'Qaida / Noorani Qaida',
  'Quran reading',
  'Tajweed',
  'Memorization',
  'Revision',
  'Islamic basics',
] as const;

const levels = [
  'Beginner Arabic letters',
  'Qaida / Noorani Qaida',
  'Quran reading beginner',
  'Quran reading intermediate',
  'Tajweed beginner',
  'Memorization beginner',
  'Memorization ongoing',
] as const;

const languages = ['English', 'Mandinka', 'Wolof', 'Fula', 'Arabic'] as const;

export default function NewClassPage() {
  const sb = supabaseBrowser();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [language, setLanguage] = useState('');
  const [start, setStart] = useState('');
  const [duration, setDuration] = useState(60);
  const [capacity, setCapacity] = useState(20);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await sb.from('classes').insert({
      title,
      subject: subject || null,
      level: level || null,
      language: language || null,
      start_time: new Date(start).toISOString(),
      duration_min: duration,
      capacity,
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

        <select
          className="w-full rounded border p-2"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        >
          <option value="">Subject</option>
          {subjects.map((subjectOption) => (
            <option key={subjectOption} value={subjectOption}>
              {subjectOption}
            </option>
          ))}
        </select>

        <select
          className="w-full rounded border p-2"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option value="">Level</option>
          {levels.map((levelOption) => (
            <option key={levelOption} value={levelOption}>
              {levelOption}
            </option>
          ))}
        </select>

        <select
          className="w-full rounded border p-2"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="">Language</option>
          {languages.map((languageOption) => (
            <option key={languageOption} value={languageOption}>
              {languageOption}
            </option>
          ))}
        </select>

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

        <input
          type="number"
          min={1}
          max={100}
          className="w-full rounded border p-2"
          value={capacity}
          onChange={(e) => setCapacity(Number(e.target.value))}
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
