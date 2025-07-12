import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { resend } from '@/lib/resend';

const CRON_SECRET = process.env.CRON_SECRET!;

async function handle() {
  const sb = createRouteHandlerClient({ cookies: () => '' });
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const windowStart = new Date(in24h.getTime() - 10 * 60 * 1000).toISOString();
  const windowEnd   = new Date(in24h.getTime() + 10 * 60 * 1000).toISOString();

  const { data: classes } = await sb
    .from('classes')
    .select('id,title,start_time,scholar_id,enrolments(learner_id)')
    .gte('start_time', windowStart)
    .lte('start_time', windowEnd);

  if (!classes?.length) return NextResponse.json({ sent: 0 });

  const userIds = [
    ...new Set([
      ...classes.map(c => c.scholar_id),
      ...classes.flatMap(c => c.enrolments.map(e => e.learner_id)),
    ]),
  ];

  const { data: users } = await sb.auth.admin.listUsers({ perPage: userIds.length });
  const emailById: Record<string,string> = {};
  users?.forEach(u => (emailById[u.id] = u.email!));

  let sent = 0;
  for (const cls of classes) {
    const when = new Date(cls.start_time).toLocaleString();

    // scholar
    await resend.emails.send({
      from: 'Qurʼan Tutor <noreply@qurantutor.com>',
      to: emailById[cls.scholar_id],
      subject: `Reminder: Your class "${cls.title}" is tomorrow`,
      html: `<p>You are teaching <strong>${cls.title}</strong> at ${when}.</p>`,
    });
    sent++;

    // learners
    for (const e of cls.enrolments) {
      await resend.emails.send({
        from: 'Qurʼan Tutor <noreply@qurantutor.com>',
        to: emailById[e.learner_id],
        subject: `Reminder: "${cls.title}" is tomorrow`,
        html: `<p>Assalaamu ʿalaykum!<br/>Reminder that <strong>${cls.title}</strong> starts at ${when}.</p>`,
      });
      sent++;
    }
  }

  return NextResponse.json({ sent });
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('cron_secret');
  if (secret !== CRON_SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return handle();
}

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('cron_secret');
  if (secret !== CRON_SECRET) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return handle();
}
