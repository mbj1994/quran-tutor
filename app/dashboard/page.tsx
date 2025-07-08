import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
//import { Database } from '@/types_db'; // optional—remove if you haven't generated types

export default async function Dashboard() {
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-semibold">Welcome, {user.email}!</h1>
      <p className="mt-4 text-sm text-gray-500">
        You are now logged in – we’ll build the real dashboard soon.
      </p>
    </main>
  );
}
