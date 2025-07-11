// app/api/scholar/stats/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET() {
  // ── Init Supabase (server-side, cookie-aware) ────────────────────────────────
  const sb = createRouteHandlerClient({ cookies });

  // ── Auth check ──────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  // ── Fetch all classes owned by this scholar ────────────────────────────────
  const { data: classRows, error: classErr } = await sb
    .from('classes')
    .select('id, start_time')
    .eq('scholar_id', user.id);

  if (classErr) {
    return NextResponse.json(
      { error: classErr.message },
      { status: 500 },
    );
  }

  const totalClasses = classRows?.length ?? 0;
  const upcoming =
    classRows?.filter(
      (c) => new Date(c.start_time) > new Date(),
    ).length ?? 0;

  // ── Count learners across those classes ────────────────────────────────────
  let learners = 0;
  if (classRows && classRows.length) {
    const { count, error: countErr } = await sb
      .from('enrolments')
      .select('*', { count: 'exact', head: true })
      .in(
        'class_id',
        classRows.map((c) => c.id),
      );

    if (countErr) {
      return NextResponse.json(
        { error: countErr.message },
        { status: 500 },
      );
    }

    learners = count ?? 0;
  }

  // ── Return JSON payload ────────────────────────────────────────────────────
  return NextResponse.json({
    totalClasses,
    upcoming,
    learners,
  });
}
