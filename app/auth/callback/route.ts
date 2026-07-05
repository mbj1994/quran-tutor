import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=expired_link`);
  }

  const supabase = createRouteHandlerClient({ cookies });
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=expired_link`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let redirectTo = searchParams.get('redirect') || '/dashboard';

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role:roles(code)')
      .eq('id', user.id)
      .maybeSingle<{
        role: { code: string | null } | { code: string | null }[] | null;
      }>();
    const role = Array.isArray(profile?.role) ? profile.role[0] : profile?.role;

    redirectTo = role?.code === 'scholar' ? '/scholar/overview' : '/dashboard';
  }

  return NextResponse.redirect(`${origin}${redirectTo}`);
}
