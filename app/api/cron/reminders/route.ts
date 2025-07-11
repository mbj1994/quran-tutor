import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { resend } from '@/lib/resend';

// Protect route with a secret header
const CRON_SECRET = process.env.CRON_SECRET!;

export async function POST(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== CRON_SECRET)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createRouteHandlerClient({ cookies: () => '' });
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // ±10-minute window to avoid missing due to schedule drift
  const windowStart = new Date(in24h.getTime() - 10 * 60 * 1000).toISOString();
  const windowEnd = new Date(in24h.getTime() + 10 * 60 * 1000).toISOString();

  // Fetch classes starting in that window
  const { data: classes } = await sb
    .from('classes')
    .select('id,title,start_time, scholar_id, enrolments( learner_id )')
    .gte('start_time', windowStart)
    .lte('start_time', windowEnd);

  if (!classes?.length) return NextResponse.json({ sent: 0 });

  // Build recipient map
  const scholarIds = classes.map((c) => c.scholar_id);
  const learnerIds = classes.flatMap((c) =>
    c.enrolments.map((e) => e.learner_id)
  );
  const userIds = [...new Set([...scholarIds, ...learnerIds])];

  // Get emails in one go
  const { data: users } = await sb.auth.admin.listUsers({
    page: 1,
    perPage: userIds.length,
  });
  const emailById: Record<string, string> = {};
  users?.forEach((u) => (emailById[u.id] = u.email!));

  let sent = 0;

  for (const cls of classes) {
    const when = new Date(cls.start_time).toLocaleString();

    // scholar email
    await resend.emails.send({
      from: 'Qurʼan Tutor <noreply@qurantutor.com>',
      to: emailById[cls.scholar_id],
      subject: `Reminder: Your class "${cls.title}" is tomorrow`,
      html: `<p>Reminder: you are teaching <strong>${cls.title}</strong> at ${when}.</p>`,
    });
    sent++;

    // learner emails
    for (const e of cls.enrolments) {
      await resend.emails.send({
        from: 'Qurʼan Tutor <noreply@qurantutor.com>',
        to: emailById[e.learner_id],
        subject: `Reminder: "${cls.title}" is tomorrow`,
        html: `<p>Assalaamu ʿalaykum!<br/>This is a reminder that your class <strong>${cls.title}</strong> starts at ${when}.</p>`,
      });
      sent++;
    }
  }

  return NextResponse.json({ sent });
}
