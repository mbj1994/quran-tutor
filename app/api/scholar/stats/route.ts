import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

/**
 * GET /api/scholar/stats
 * Returns:
 *  { totalClasses, upcoming, learners }
 */
export async function GET() {
  // Supabase client that can read the auth cookie
  const sb = createRouteHandlerClient({ cookies });

  /* ---------- Current user ---------- */
  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json(
      { error: 'Not signed in' },
      { status: 401 }
    );
  }

  /* ---------- All classes owned by this scholar ---------- */
  const {
    data: classRows,
    error: classErr,
  } = await sb
    .from('classes')
    .select('id, start_time')
    .eq('scholar_id', user.id);

  if (classErr) {
    return NextResponse.json(
      { error: classErr.message },
      { status: 500 }
    );
  }

  const now = new Date();
  const totalClasses = classRows?.length ?? 0;
  const upcoming =
    classRows?.filter((c) => new Date(c.start_time) > now).length ?? 0;

  /* ---------- Learner count across those classes ---------- */
  let learners = 0;

  if (classRows && classRows.length) {
    const classIds = classRows.map((c) => c.id);

    const { count, error: countErr } = await sb
      .from('enrolments')
      .select('*', { count: 'exact', head: true })
      .in('class_id', classIds);

    if (countErr) {
      return NextResponse.json(
        { error: countErr.message },
        { status: 500 }
      );
    }

    learners = count ?? 0;
  }

  /* ---------- Return JSON ---------- */
  return NextResponse.json({
    totalClasses,
    upcoming,
    learners,
  });
}
