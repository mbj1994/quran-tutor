import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

/* ─── ENV ────────────────────────────────────────── */
const CRON_SECRET = process.env.CRON_SECRET!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const resend = new Resend(process.env.RESEND_API_KEY!);

/* ─── POST /api/cron/reminders ───────────────────── */
export async function POST(req: NextRequest) {
  /* ① Protect route */
  if (req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  /* ② Service-role client (no cookies needed) */
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  /* ③ Time window: 23 h 50 m → 24 h 10 m ahead */
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const windowStart = new Date(in24h.getTime() - 10 * 60 * 1000).toISOString();
  const windowEnd   = new Date(in24h.getTime() + 10 * 60 * 1000).toISOString(); 

  /* const now = new Date();
  
  const windowStart = new Date(now.getTime() + 1 * 60 * 1000).toISOString(); // +1 min
  const windowEnd   = new Date(now.getTime() + 2 * 60 * 1000).toISOString(); // +2 min
  */


  /* ④ Fetch classes in that window + booked learners */
  const { data: classes, error } = await sb
    .from('classes')
    .select('id,title,start_time,scholar_id,enrolments( learner_id )')
    .gte('start_time', windowStart)
    .lte('start_time', windowEnd);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!classes?.length) return NextResponse.json({ sent: 0 });

  /* ⑤ Map userId → email (single admin call) */
  const userIds = Array.from(
    new Set(
      classes.flatMap((c) => [c.scholar_id, ...c.enrolments.map((e) => e.learner_id)])
    )
  );

  const { data: users } = await sb.auth.admin.listUsers({
    page: 1,
    perPage: userIds.length,
  });

  const emailById: Record<string, string> = {};
  if (Array.isArray(users)) {
    users.forEach((u) => {
      if (u.email) emailById[u.id] = u.email;
    });
  }


  /* ⑥ Send emails */
  let sent = 0;

  for (const cls of classes) {
    const when = new Date(cls.start_time).toLocaleString();

    /* scholar */
    const scholarEmail = emailById[cls.scholar_id];
    if (scholarEmail) {
      await resend.emails.send({
        from: 'Qurʼan Tutor <noreply@qurantutor.com>',
        to: scholarEmail,
        subject: `Reminder: Your class "${cls.title}" is tomorrow`,
        html: `<p>You are teaching <strong>${cls.title}</strong> at ${when}.</p>`,
      });
      sent++;
    }

    /* learners */
    for (const e of cls.enrolments) {
      const learnerEmail = emailById[e.learner_id];
      if (learnerEmail) {
        await resend.emails.send({
          from: 'Qurʼan Tutor <noreply@qurantutor.com>',
          to: learnerEmail,
          subject: `Reminder: "${cls.title}" is tomorrow`,
          html: `<p>Assalaamu ʿalaykum!<br/>Your class <strong>${cls.title}</strong> starts at ${when}.</p>`,
        });
        sent++;
      }
    }
  }

  return NextResponse.json({ sent });
}


