import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

export type SubscriptionState = 'active' | 'pending' | 'inactive';

export type SubscriptionRecord = {
  status: string | null;
  current_period_end: string | null;
  created_at: string | null;
};

export type UserSubscriptionStatus = {
  state: SubscriptionState;
  subscription: SubscriptionRecord | null;
  error: PostgrestError | null;
};

export function normalizeSubscriptionState(
  status: string | null | undefined
): SubscriptionState {
  const normalizedStatus = status?.trim().toLowerCase();

  if (normalizedStatus === 'active' || normalizedStatus === 'trialing') {
    return 'active';
  }

  if (normalizedStatus === 'pending') {
    return 'pending';
  }

  return 'inactive';
}

export async function getUserSubscriptionStatus(
  supabase: SupabaseClient,
  userId: string | null | undefined
): Promise<UserSubscriptionStatus> {
  if (!userId) {
    return {
      state: 'inactive',
      subscription: null,
      error: null,
    };
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select('status, current_period_end, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionRecord>();

  return {
    state: error ? 'inactive' : normalizeSubscriptionState(data?.status),
    subscription: data ?? null,
    error,
  };
}
