import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type LearnerRow = {
  id: string;
  parent_id: string;
};

type SubscriptionRow = {
  status: string | null;
};

type ClassRow = {
  id: string;
  capacity: number;
};

function getStudentSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase server configuration.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(request: Request) {
  let studentAccessCode = '';
  let classId = '';

  try {
    const body = (await request.json()) as {
      student_access_code?: unknown;
      class_id?: unknown;
    };

    studentAccessCode = String(body.student_access_code ?? '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
    classId = String(body.class_id ?? '').trim();
  } catch {
    return NextResponse.json(
      { error: 'Please choose a valid Live Class.' },
      { status: 400 }
    );
  }

  if (!/^[A-Z0-9]{8}$/.test(studentAccessCode) || !classId) {
    return NextResponse.json(
      { error: 'Please choose a valid Live Class.' },
      { status: 400 }
    );
  }

  let sb;

  try {
    sb = getStudentSupabase();
  } catch {
    return NextResponse.json(
      { error: 'Student booking is not configured yet.' },
      { status: 500 }
    );
  }

  const { data: learner, error: learnerError } = await sb
    .from('learners')
    .select('id, parent_id')
    .eq('student_access_code', studentAccessCode)
    .maybeSingle<LearnerRow>();

  if (learnerError) {
    return NextResponse.json(
      { error: 'We could not check that student code right now.' },
      { status: 500 }
    );
  }

  if (!learner?.parent_id) {
    return NextResponse.json(
      { error: 'We could not find that student code.' },
      { status: 404 }
    );
  }

  const { data: subscription, error: subscriptionError } = await sb
    .from('subscriptions')
    .select('status')
    .eq('user_id', learner.parent_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionRow>();

  if (subscriptionError) {
    return NextResponse.json(
      { error: 'We could not check family booking access right now.' },
      { status: 500 }
    );
  }

  const hasActiveSubscription =
    subscription?.status === 'active' || subscription?.status === 'trialing';

  if (!hasActiveSubscription) {
    return NextResponse.json(
      { error: 'Your family needs an active subscription to book live classes.' },
      { status: 402 }
    );
  }

  const { data: classRow, error: classError } = await sb
    .from('classes')
    .select('id, capacity')
    .eq('id', classId)
    .gte('start_time', new Date().toISOString())
    .maybeSingle<ClassRow>();

  if (classError) {
    return NextResponse.json(
      { error: 'We could not check that Live Class right now.' },
      { status: 500 }
    );
  }

  if (!classRow) {
    return NextResponse.json(
      { error: 'That Live Class is no longer available.' },
      { status: 404 }
    );
  }

  const { data: existingBooking, error: existingError } = await sb
    .from('enrolments')
    .select('id')
    .eq('class_id', classRow.id)
    .eq('learner_profile_id', learner.id)
    .maybeSingle<{ id: string }>();

  if (existingError) {
    return NextResponse.json(
      { error: 'We could not check your booking right now.' },
      { status: 500 }
    );
  }

  if (existingBooking) {
    return NextResponse.json(
      { error: 'You are already booked into this class.' },
      { status: 409 }
    );
  }

  const { count, error: countError } = await sb
    .from('enrolments')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', classRow.id);

  if (countError) {
    return NextResponse.json(
      { error: 'We could not check available spaces right now.' },
      { status: 500 }
    );
  }

  if ((count ?? 0) >= classRow.capacity) {
    return NextResponse.json({ error: 'This class is full.' }, { status: 409 });
  }

  const { error: insertError } = await sb.from('enrolments').insert({
    class_id: classRow.id,
    learner_id: learner.parent_id,
    learner_profile_id: learner.id,
  });

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json(
        { error: 'You are already booked into this class.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'We could not book this Live Class right now.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
