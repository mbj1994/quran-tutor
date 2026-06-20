import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

// GET /api/scholar/stats
export async function GET() {
  const sb = createRouteHandlerClient({ cookies });

  // current user
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not signed in' }, { status: 401 });

  // fetch this scholar’s classes
  const { data: classes } = await sb
    .from('classes')
    .select('id, start_time')
    .eq('scholar_id', user.id);

  const totalClasses = classes?.length ?? 0;
  const upcoming = classes?.filter(c => new Date(c.start_time) > new Date()).length ?? 0;

  // learner count across those classes
  const { count: learnerCount } = await sb
    .from('enrolments')
    .select('id', { count: 'exact', head: true })
    .in('class_id', classes?.map(c => c.id) as string[] ?? []);

  return NextResponse.json({
    totalClasses,
    upcoming,
    learners: learnerCount ?? 0
  });
}
