import 'server-only';

import { cookies } from 'next/headers';
import {
  createRouteHandlerClient,
  createServerComponentClient,
} from '@supabase/auth-helpers-nextjs';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerComponentClient({
    // Auth Helpers 0.10 types this callback as Next's async return type,
    // while its runtime adapter still expects the resolved cookie store.
    cookies: () => cookieStore as unknown as ReturnType<typeof cookies>,
  });
}

export async function createRouteHandlerSupabaseClient() {
  const cookieStore = await cookies();

  return createRouteHandlerClient({
    cookies: () => cookieStore as unknown as ReturnType<typeof cookies>,
  });
}
