import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type LearnerRow = {
  id: string;
  parent_id: string;
  full_name: string;
  preferred_language: string | null;
  quran_level: string | null;
  learning_goals: string | null;
  points: number | null;
  lessons_completed: number | null;
  current_badge: string | null;
};

type BookedClass = {
  id: string;
  title: string;
  subject: string | null;
  level: string | null;
  language: string | null;
  start_time: string;
  duration_min: number | null;
  meeting_url: string | null;
};

type EnrolmentRow = {
  id: string;
  status: string | null;
  class: BookedClass | BookedClass[] | null;
};

type ProgressClass = {
  id: string;
  title: string;
};

type LessonProgressRow = {
  id: string;
  class_id: string;
  attendance_status: string;
  notes: string | null;
  homework: string | null;
  covered: string | null;
  revision: string | null;
  parent_note: string | null;
  updated_at: string | null;
  created_at: string | null;
  class: ProgressClass | ProgressClass[] | null;
};

type BrowseClassRow = {
  id: string;
  title: string;
  subject: string | null;
  level: string | null;
  language: string | null;
  start_time: string;
  duration_min: number | null;
  capacity: number;
  scholar: { full_name: string | null } | { full_name: string | null }[] | null;
  enrolments: { count: number }[];
};

function firstOrNull<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

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
  let code = '';

  try {
    const body = (await request.json()) as { code?: unknown };
    code = String(body.code ?? '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
  } catch {
    return NextResponse.json(
      { error: 'Enter a valid student access code.' },
      { status: 400 }
    );
  }

  if (!/^[A-Z0-9]{8}$/.test(code)) {
    return NextResponse.json(
      { error: 'Enter an 8-character student access code.' },
      { status: 400 }
    );
  }

  let sb;

  try {
    sb = getStudentSupabase();
  } catch {
    return NextResponse.json(
      { error: 'Student access is not configured yet.' },
      { status: 500 }
    );
  }

  const { data: learner, error: learnerError } = await sb
    .from('learners')
    .select(
      'id, parent_id, full_name, preferred_language, quran_level, learning_goals, points, lessons_completed, current_badge'
    )
    .eq('student_access_code', code)
    .maybeSingle<LearnerRow>();

  if (learnerError) {
    return NextResponse.json(
      { error: 'We could not check that student code right now.' },
      { status: 500 }
    );
  }

  if (!learner) {
    return NextResponse.json(
      { error: 'We could not find that student code.' },
      { status: 404 }
    );
  }

  const [
    { data: enrolmentRows, error: enrolmentError },
    { data: progressRows, error: progressError },
    { data: browseRows, error: browseError },
  ] =
    await Promise.all([
      sb
        .from('enrolments')
        .select(
          `
            id,
            status,
            class:classes (
              id,
              title,
              subject,
              level,
              language,
              start_time,
              duration_min,
              meeting_url
            )
          `
        )
        .eq('learner_profile_id', learner.id)
        .order('start_time', {
          foreignTable: 'classes',
          ascending: true,
        }),
      sb
        .from('lesson_progress')
        .select(
          `
            id,
            class_id,
            attendance_status,
            notes,
            homework,
            covered,
            revision,
            parent_note,
            updated_at,
            created_at,
            class:classes (
              id,
              title
            )
          `
        )
        .eq('learner_profile_id', learner.id)
        .order('updated_at', { ascending: false }),
      sb
        .from('classes')
        .select(
          `
            id,
            title,
            subject,
            level,
            language,
            start_time,
            duration_min,
            capacity,
            scholar:profiles!classes_scholar_id_fkey (
              full_name
            ),
            enrolments(count)
          `
        )
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(12),
    ]);

  if (enrolmentError || progressError || browseError) {
    return NextResponse.json(
      { error: 'We could not load the student learning page right now.' },
      { status: 500 }
    );
  }

  const classes = ((enrolmentRows ?? []) as EnrolmentRow[]).map((enrolment) => ({
    id: enrolment.id,
    status: enrolment.status,
    class: firstOrNull(enrolment.class),
  }));

  const progress = ((progressRows ?? []) as LessonProgressRow[]).map((row) => ({
    id: row.id,
    class_id: row.class_id,
    attendance_status: row.attendance_status,
    notes: row.notes,
    homework: row.homework,
    covered: row.covered,
    revision: row.revision,
    parent_note: row.parent_note,
    updated_at: row.updated_at,
    created_at: row.created_at,
    class: firstOrNull(row.class),
  }));

  const bookedClassIds = new Set(
    classes.map((row) => row.class?.id).filter(Boolean) as string[]
  );

  const browseClasses = ((browseRows ?? []) as BrowseClassRow[])
    .map((classRow) => {
      const booked = classRow.enrolments[0]?.count ?? 0;

      return {
        id: classRow.id,
        title: classRow.title,
        scholar_name: firstOrNull(classRow.scholar)?.full_name ?? null,
        subject: classRow.subject,
        level: classRow.level,
        language: classRow.language,
        start_time: classRow.start_time,
        duration_min: classRow.duration_min,
        available_spaces: Math.max(classRow.capacity - booked, 0),
        is_booked: bookedClassIds.has(classRow.id),
        language_match:
          Boolean(learner.preferred_language) &&
          classRow.language === learner.preferred_language,
        level_match:
          Boolean(learner.quran_level) && classRow.level === learner.quran_level,
      };
    })
    .sort((a, b) => {
      const aScore = Number(a.language_match) * 2 + Number(a.level_match);
      const bScore = Number(b.language_match) * 2 + Number(b.level_match);

      if (aScore !== bScore) return bScore - aScore;
      return (
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
    });

  const safeLearner = {
    id: learner.id,
    full_name: learner.full_name,
    preferred_language: learner.preferred_language,
    quran_level: learner.quran_level,
    learning_goals: learner.learning_goals,
    points: learner.points,
    lessons_completed: learner.lessons_completed,
    current_badge: learner.current_badge,
  };

  return NextResponse.json({
    learner: safeLearner,
    classes,
    progress,
    browseClasses,
  });
}
