import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { getRoleCode, type ProfileRole } from '@/lib/roles';
import { scholarStatuses, type ScholarStatus } from '@/lib/scholarApproval';

type StatusRequest = {
  profile_id?: string;
  scholar_status?: string;
};

type ScholarProfile = ProfileRole & {
  id: string;
};

function json(status: number, body: { ok: boolean; error?: string }) {
  return NextResponse.json(body, { status });
}

function isScholarStatus(value: string): value is ScholarStatus {
  return scholarStatuses.includes(value as ScholarStatus);
}

export async function POST(request: Request) {
  const sb = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return json(401, { ok: false, error: 'Sign in required.' });
  }

  const { data: adminProfile } = await sb
    .from('profiles')
    .select('role:roles(code)')
    .eq('id', user.id)
    .maybeSingle<ProfileRole>();

  if (getRoleCode(adminProfile) !== 'admin') {
    return json(403, { ok: false, error: 'You do not have access.' });
  }

  let payload: StatusRequest;

  try {
    payload = (await request.json()) as StatusRequest;
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON body.' });
  }

  const profileId = payload.profile_id?.trim();
  const scholarStatus = payload.scholar_status?.trim();

  if (!profileId || !scholarStatus || !isScholarStatus(scholarStatus)) {
    return json(400, { ok: false, error: 'Choose a valid scholar status.' });
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: targetProfile, error: targetError } = await supabaseAdmin
    .from('profiles')
    .select('id, role:roles(code)')
    .eq('id', profileId)
    .maybeSingle<ScholarProfile>();

  if (targetError) {
    return json(500, { ok: false, error: targetError.message });
  }

  if (!targetProfile || getRoleCode(targetProfile) !== 'scholar') {
    return json(404, { ok: false, error: 'Scholar profile not found.' });
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ scholar_status: scholarStatus })
    .eq('id', profileId);

  if (error) {
    return json(500, { ok: false, error: error.message });
  }

  revalidatePath('/admin/scholars');
  return json(200, { ok: true });
}
