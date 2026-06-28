import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const allowedRoles = ['parent', 'scholar', 'learner'] as const;

type RoleCode = (typeof allowedRoles)[number];

type SetRoleRequest = {
  email?: string;
  role?: string;
};

function json(status: number, body: { ok: boolean; error?: string }) {
  return NextResponse.json(body, { status });
}

function isRoleCode(value: string): value is RoleCode {
  return allowedRoles.includes(value as RoleCode);
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

  let payload: SetRoleRequest;

  try {
    payload = (await request.json()) as SetRoleRequest;
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON body.' });
  }

  const email = payload.email?.trim().toLowerCase();
  const roleCode = payload.role?.trim().toLowerCase() ?? '';

  if (!email) {
    return json(400, { ok: false, error: 'Email is required.' });
  }

  if (!isRoleCode(roleCode)) {
    return json(400, { ok: false, error: 'Role must be parent, scholar, or learner.' });
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

  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('code', roleCode)
    .maybeSingle<{ id: string }>();

  if (roleError) {
    return json(500, { ok: false, error: roleError.message });
  }

  if (!role) {
    return json(404, { ok: false, error: 'Role not found.' });
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: userId, role_id: role.id }, { onConflict: 'id' });

  if (profileError) {
    return json(500, { ok: false, error: profileError.message });
  }

  return json(200, { ok: true });
}
