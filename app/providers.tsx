'use client';

import { ReactNode } from 'react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { supabaseBrowser } from '@/lib/supabaseClient';

/**
 * Wraps the entire client tree with Supabase's SessionContextProvider.
 * Must be a client component, hence the 'use client' directive.
 */
export function Providers({ children }: { children: ReactNode }) {
  const supabase = supabaseBrowser();

  return (
    <SessionContextProvider supabaseClient={supabase}>
      {children}
    </SessionContextProvider>
  );
}
