import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { getRoleCode, type ProfileRole } from '@/lib/roles';

const ALLOWED_NEXT_PATHS = new Set([
  '/dashboard',
  '/classes',
  '/my-classes',
  '/subscription',
  '/scholar/overview',
  '/scholar/classes',
  '/auth/update-password',
]);

function getSafeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return null;
  }

  return ALLOWED_NEXT_PATHS.has(value) ? value : null;
}

function getAuthErrorMessage(errorCode: string | null) {
  if (errorCode === 'otp_expired') {
    return 'expired-reset';
  }

  return 'auth-error';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams, origin } = url;
  const code = searchParams.get('code');
  const errorCode = searchParams.get('error_code');
  const next = getSafeNext(searchParams.get('next') || searchParams.get('redirect_to'));

  if (errorCode) {
    return NextResponse.redirect(`${origin}/login?auth_message=${getAuthErrorMessage(errorCode)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?auth_message=auth-error`);
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?auth_message=auth-error`);
  }

  if (next === '/auth/update-password') {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role:roles(code)')
    .eq('id', user.id)
    .maybeSingle<ProfileRole>();

  const roleCode = getRoleCode(profile);
  const redirectTo =
    roleCode === 'scholar'
      ? '/scholar/overview'
      : roleCode === 'admin'
        ? '/admin'
        : next ?? '/dashboard';

  return NextResponse.redirect(`${origin}${redirectTo}`);
}
