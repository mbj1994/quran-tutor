import { NextResponse } from 'next/server';
import { getRoleCode, type ProfileRole } from '@/lib/roles';
import { createRouteHandlerSupabaseClient } from '@/lib/supabaseServer';

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
    if (next === '/auth/update-password') {
      return NextResponse.redirect(
        `${origin}/auth/update-password?error_code=${encodeURIComponent(errorCode)}`
      );
    }

    return NextResponse.redirect(`${origin}/login?auth_message=${getAuthErrorMessage(errorCode)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?auth_message=auth-error`);
  }

  const supabase = await createRouteHandlerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    if (next === '/auth/update-password') {
      return NextResponse.redirect(
        `${origin}/auth/update-password?error_code=invalid_recovery`
      );
    }

    return NextResponse.redirect(`${origin}/login?auth_message=auth-error`);
  }

  if (next === '/auth/update-password') {
    return NextResponse.redirect(`${origin}${next}?recovery=1`);
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
