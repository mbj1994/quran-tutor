'use client';

import { useEffect, useMemo, useState } from 'react';
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

type ProfileRole = {
  role: { code: string | null } | { code: string | null }[] | null;
};

function getRoleCode(profile: ProfileRole | null) {
  const role = Array.isArray(profile?.role) ? profile.role[0] : profile?.role;
  return role?.code ?? null;
}

function looksLikeUrl(value: string) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function NewClassPage() {
  const sb = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [language, setLanguage] = useState('');
  const [description, setDescription] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [start, setStart] = useState('');
  const [duration, setDuration] = useState(60);
  const [capacity, setCapacity] = useState(20);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [roleStatus, setRoleStatus] = useState<'checking' | 'authorized'>(
    'checking'
  );

  useEffect(() => {
    let active = true;

    async function checkScholarAccess() {
      const {
        data: { user },
      } = await sb.auth.getUser();

      if (!active) return;

      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: profile } = await sb
        .from('profiles')
        .select('role:roles(code)')
        .eq('id', user.id)
        .maybeSingle<ProfileRole>();

      if (!active) return;

      if (getRoleCode(profile) !== 'scholar') {
        router.replace('/dashboard');
        return;
      }

      setRoleStatus('authorized');
    }

    void checkScholarAccess();

    return () => {
      active = false;
    };
  }, [router, sb]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (roleStatus !== 'authorized') return;

    const trimmedMeetingUrl = meetingUrl.trim();

    if (!looksLikeUrl(trimmedMeetingUrl)) {
      setMsg('Please enter a full video meeting URL, starting with https://.');
      return;
    }

    setLoading(true);
    setMsg(null);

    const {
      data: { user },
    } = await sb.auth.getUser();

    if (!user) {
      router.replace('/login');
      return;
    }

    const { error } = await sb.from('classes').insert({
      scholar_id: user.id,
      title,
      subject: subject || null,
      level: level || null,
      language: language || null,
      description: description || null,
      meeting_url: trimmedMeetingUrl || null,
      start_time: new Date(start).toISOString(),
      duration_min: duration,
      capacity,
    });

    setLoading(false);
    if (error) return setMsg(error.message);

    router.replace('/scholar/classes');
  }

  if (roleStatus === 'checking') {
    return (
      <main className="mx-auto max-w-md bg-gray-50 p-4">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-600">Checking scholar access...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl bg-gray-50 p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-950">
          Create a live Qur&apos;an class
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Set the subject, level, language, schedule, and live class link.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-800">
            Class title
          </span>
          <input
            required
            className="w-full rounded-lg border border-gray-300 p-2"
            placeholder="Surah Al-Fatihah"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-800">
              Subject
            </span>
            <select
              className="w-full rounded-lg border border-gray-300 p-2"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="">Select subject</option>
              {subjects.map((subjectOption) => (
                <option key={subjectOption} value={subjectOption}>
                  {subjectOption}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-800">
              Level
            </span>
            <select
              className="w-full rounded-lg border border-gray-300 p-2"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value="">Select level</option>
              {levels.map((levelOption) => (
                <option key={levelOption} value={levelOption}>
                  {levelOption}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-800">
              Language
            </span>
            <select
              className="w-full rounded-lg border border-gray-300 p-2"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="">Select language</option>
              {languages.map((languageOption) => (
                <option key={languageOption} value={languageOption}>
                  {languageOption}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-800">
            Start time
          </span>
          <input
            required
            type="datetime-local"
            className="w-full rounded-lg border border-gray-300 p-2"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-800">
              Duration
            </span>
            <input
              type="number"
              min={15}
              max={180}
              step={15}
              className="w-full rounded-lg border border-gray-300 p-2"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-800">
              Capacity
            </span>
            <input
              type="number"
              min={1}
              max={100}
              className="w-full rounded-lg border border-gray-300 p-2"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-800">
            Description
          </span>
          <textarea
            className="min-h-28 w-full rounded-lg border border-gray-300 p-2"
            placeholder="What learners will practise in this class"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-800">
            Live class link / video meeting URL
          </span>
          <input
            type="url"
            className="w-full rounded-lg border border-gray-300 p-2"
            placeholder="https://..."
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
          />
          <span className="mt-1 block text-xs text-gray-500">
            Use Zoom, Google Meet, or Jitsi for now.
          </span>
        </label>

        <button
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save class'}
        </button>

        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </form>
    </main>
  );
}
