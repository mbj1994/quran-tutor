import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

type ProfileRole = {
  role: { code: string | null } | { code: string | null }[] | null;
};

function getSafeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return null;
  }

  return value;
}

function getRoleCode(profile: ProfileRole | null) {
  const role = Array.isArray(profile?.role) ? profile.role[0] : profile?.role;
  return role?.code ?? null;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = getSafeNext(searchParams.get('next') || searchParams.get('redirect_to'));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?auth_message=expired-reset`);
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?auth_message=expired-reset`);
  }

  if (next === '/auth/update-password') {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let redirectTo = next ?? '/dashboard';

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role:roles(code)')
      .eq('id', user.id)
      .maybeSingle<ProfileRole>();

    redirectTo = getRoleCode(profile) === 'scholar' ? '/scholar/overview' : '/dashboard';
  }

  return NextResponse.redirect(`${origin}${redirectTo}`);
}
