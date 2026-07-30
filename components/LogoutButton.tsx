'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;

    setLoading(true);
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="flex min-h-11 min-w-0 items-center justify-center rounded-xl px-2 py-2 text-sm font-medium leading-5 text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-50 sm:px-3"
    >
      {loading ? 'Logging out...' : 'Logout'}
    </button>
  );
}
