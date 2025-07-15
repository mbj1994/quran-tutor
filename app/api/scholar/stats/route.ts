import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createRouteHandlerClient,
} from '@supabase/auth-helpers-nextjs';

export async function GET() {
  const sb = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  /* ---------- Classes created by this scholar ---------- */
  const { data: classRows } = await sb
    .from('classes')
    .select('id,start_time')
    .eq('scholar_id', user.id);

  const totalClasses = classRows?.length ?? 0;
  const upcoming =
    classRows?.filter(
      (c) => new Date(c.start_time) > new Date()
    ).length ?? 0;

  /* ---------- Learners booked across those classes ---------- */
  const classIds = classRows?.map((c) => c.id) ?? [];

  const { count: learnerCount } = await sb
    .from('enrolments')
    .select('id', { count: 'exact', head: true })
    .in('class_id', classIds);

  /* ---------- Return metrics ---------- */
  return NextResponse.json({
    totalClasses,
    upcoming,
    learners: learnerCount ?? 0,
  });
}
