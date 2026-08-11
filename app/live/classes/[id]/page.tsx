import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import {
  createDailyClassroom,
  DailyConfigurationError,
  type DailyClassroom as DailyClassroomDetails,
} from '@/lib/daily';
import DailyClassroom from './DailyClassroom';

export const dynamic = 'force-dynamic';

const STUDENT_ACCESS_COOKIE = 'quran_tutor_student_access';

type PageProps = {
  params: Promise<{ id: string }>;
};

type ClassRow = {
  id: string;
  scholar_id: string;
  title: string;
  meeting_url: string | null;
  scholar:
    | { full_name: string | null }
    | { full_name: string | null }[]
    | null;
};

type Viewer = {
  name: string;
  isOwner: boolean;
  backHref: string;
  backLabel: string;
};

function firstOrNull<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function AccessMessage({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="mx-auto max-w-lg p-4 sm:p-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm shadow-emerald-950/5">
        <h1 className="text-xl font-semibold text-gray-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">{message}</p>
        <Link
          href="/"
          className="mt-5 inline-flex min-h-11 items-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Back home
        </Link>
      </section>
    </main>
  );
}

export default async function LiveClassroomPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const sb = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await sb.auth.getUser();
  const admin = createSupabaseAdminClient();
  const { data: classRow, error: classError } = await admin
    .from('classes')
    .select(
      'id, scholar_id, title, meeting_url, scholar:profiles!classes_scholar_id_fkey(full_name)'
    )
    .eq('id', id)
    .maybeSingle<ClassRow>();

  if (classError || !classRow) {
    return (
      <AccessMessage
        title="Classroom unavailable"
        message="We could not find this live class."
      />
    );
  }

  let viewer: Viewer | null = null;

  if (user && classRow.scholar_id === user.id) {
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle<{ full_name: string | null }>();

    viewer = {
      name: profile?.full_name ?? 'Scholar',
      isOwner: true,
      backHref: '/scholar/classes',
      backLabel: 'Back to Teaching Classes',
    };
  } else if (user) {
    const { data: ownedLearners } = await admin
      .from('learners')
      .select('id, full_name')
      .eq('parent_id', user.id);
    const learnerIds = (ownedLearners ?? []).map((learner) => learner.id);
    const { data: enrolment } =
      learnerIds.length > 0
        ? await admin
            .from('enrolments')
            .select('learner_profile_id')
            .eq('class_id', id)
            .in('learner_profile_id', learnerIds)
            .limit(1)
            .maybeSingle<{ learner_profile_id: string }>()
        : { data: null };

    if (enrolment) {
      const bookedLearner = (ownedLearners ?? []).find(
        (learner) => learner.id === enrolment.learner_profile_id
      );
      viewer = {
        name: bookedLearner?.full_name ?? 'Parent',
        isOwner: false,
        backHref: '/my-classes',
        backLabel: 'Back to My Live Classes',
      };
    }
  } else {
    const studentCode = cookieStore.get(STUDENT_ACCESS_COOKIE)?.value;

    if (studentCode) {
      const { data: learner } = await admin
        .from('learners')
        .select('id, full_name')
        .eq('student_access_code', studentCode)
        .maybeSingle<{ id: string; full_name: string }>();

      if (learner) {
        const { data: enrolment } = await admin
          .from('enrolments')
          .select('id')
          .eq('class_id', id)
          .eq('learner_profile_id', learner.id)
          .limit(1)
          .maybeSingle<{ id: string }>();

        if (enrolment) {
          viewer = {
            name: learner.full_name,
            isOwner: false,
            backHref: '/student',
            backLabel: 'Back to Student Access',
          };
        }
      }
    }
  }

  if (!viewer) {
    return (
      <AccessMessage
        title="Classroom access needed"
        message="This classroom is only available to its scholar and families booked into the class."
      />
    );
  }

  let classroom: DailyClassroomDetails | null = null;
  let classroomMessage: string | null = null;

  try {
    classroom = await createDailyClassroom({
      classId: classRow.id,
      participantName: viewer.name,
      isOwner: viewer.isOwner,
    });
  } catch (error) {
    if (error instanceof DailyConfigurationError) {
      classroomMessage =
        'Live classroom is not configured yet. Please use the backup class link.';
    } else {
      console.error('[daily-classroom] Could not prepare classroom', {
        classId: classRow.id,
        error,
      });
      classroomMessage =
        'We could not open the classroom right now. Please use the backup class link.';
    }
  }

  const scholarName =
    firstOrNull(classRow.scholar)?.full_name ?? 'Approved scholar';

  return (
    <main className="mx-auto max-w-6xl p-3 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-700">
            Live Qur&apos;an Classroom
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-950">
            {classRow.title}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Scholar / Ustass: {scholarName}
          </p>
        </div>
        <Link
          href={viewer.backHref}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {viewer.backLabel}
        </Link>
      </div>

      <section className="rounded-[1.5rem] border border-gray-200 bg-white p-3 shadow-lg shadow-emerald-950/5 sm:p-4">
        {classroom ? (
          <DailyClassroom
            roomUrl={classroom.roomUrl}
            token={classroom.token}
            isScholar={viewer.isOwner}
            recordingAvailable={classroom.recordingAvailable}
          />
        ) : (
          <div className="flex h-[clamp(24rem,68svh,44rem)] items-center justify-center rounded-2xl bg-gray-950 p-4 text-center text-white sm:p-6">
            <p className="max-w-md text-base leading-7">{classroomMessage}</p>
          </div>
        )}
      </section>

      {viewer.isOwner && (
        <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-950">Class Recording</h2>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            Recording should only be used for lesson review and child learning
            support.
          </p>
          <p className="mt-1 text-sm leading-6 text-amber-800">
            {classroom?.recordingAvailable
              ? 'Use the recording control inside the classroom when you are ready. Recording never starts automatically.'
              : 'Cloud recording is unavailable right now. You can continue the class and add a private recording link afterward.'}
          </p>
          {/* TODO: Add explicit parent recording consent when a consent field or workflow is introduced. */}
        </section>
      )}

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm leading-6 text-emerald-950">
          <p>Allow camera and microphone when your browser asks.</p>
          <p className="mt-1">
            Parents should supervise children during live classes. Do not share
            private class links or recordings publicly.
          </p>
        </div>
        {classRow.meeting_url && (
          <a
            href={classRow.meeting_url}
            target="_blank"
            rel="noreferrer"
            className="break-all rounded-lg px-2 py-2 text-sm font-semibold text-emerald-800 underline hover:bg-emerald-100"
          >
            Having trouble? Open backup class link
          </a>
        )}
      </div>
    </main>
  );
}
