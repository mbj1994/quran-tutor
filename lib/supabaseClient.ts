// lib/supabaseClient.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * Returns a singleton Supabase client on the client side
 * (for the Next.js **App Router**).
 */
export const supabaseBrowser = () => createClientComponentClient();
