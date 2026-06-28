import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type SetPasswordRequest = {
  email?: string;
  password?: string;
};

function json(status: number, body: { ok: boolean; error?: string }) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return json(404, { ok: false, error: 'Not found.' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, {
      ok: false,
      error: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.',
    });
  }

  let payload: SetPasswordRequest;

  try {
    payload = (await request.json()) as SetPasswordRequest;
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON body.' });
  }

  const email = payload.email?.trim().toLowerCase();
  const password = payload.password ?? '';

  if (!email) {
    return json(400, { ok: false, error: 'Email is required.' });
  }

  if (password.length < 6) {
    return json(400, {
      ok: false,
      error: 'Password must be at least 6 characters.',
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let page = 1;
  let userId: string | null = null;

  while (!userId) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) {
      return json(500, { ok: false, error: error.message });
    }

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);

    if (user) {
      userId = user.id;
      break;
    }

    if (data.users.length < 100) {
      break;
    }

    page += 1;
  }

  if (!userId) {
    return json(404, {
      ok: false,
      error: 'User not found. Create the account first.',
    });
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    password,
  });

  if (updateError) {
    return json(500, { ok: false, error: updateError.message });
  }

  return json(200, { ok: true });
}
