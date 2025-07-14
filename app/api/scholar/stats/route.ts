import { NextResponse } from 'next/server'; 
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(_req: Request) {
  const sb = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Count total & upcoming classes
  const { data: classCounts } = await sb
    .from('classes')
    .select(`id, start_time`)
    .eq('scholar_id', user.id);

  const totalClasses = classCounts?.length ?? 0;
  const upcoming = classCounts?.filter(
    (c) => new Date(c.start_time) > new Date()
  ).length ?? 0;

  // Count total learners across all your classes
  const { data: learnerCount } = await sb
    .from('enrolments')
    .select('id', { count: 'exact', head: true })
    .in(
      'class_id',
      classCounts?.map((c) => c.id) as string[] ?? []
    );

  return NextResponse.json({
    totalClasses,
    upcoming,
    learners: learnerCount?.count ?? 0,
  });
}
