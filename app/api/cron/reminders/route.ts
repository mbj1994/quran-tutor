import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { resend } from '@/lib/resend';

// Vercel automatically adds this header when the call
// originates from a Cron Job. Requests from the public internet
// won’t have it, so we use it as our guard.
const CRON_HEADER = 'x-vercel-cron';

export async function GET(req: NextRequest) {
  if (!req.headers.has(CRON_HEADER)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const sb = createRouteHandlerClient({ cookies: () => '' });

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const winStart = new Date(in24h.getTime() - 10 * 60 * 1000).toISOString();
  const winEnd   = new Date(in24h.getTime() + 10 * 60 * 1000).toISOString();

  const { data: classes } = await sb
    .from('classes')
    .select('id,title,start_time,scholar_id,enrolments(learner_id)')
    .gte('start_time', winStart)
    .lte('start_time', winEnd);

  if (!classes?.length) return NextResponse.json({ sent: 0 });

  const ids = [
    ...new Set([
      ...classes.map(c => c.scholar_id),
      ...classes.flatMap(c => c.enrolments.map(e => e.learner_id)),
    ]),
  ];

  const { data: users } = await sb.auth.admin.listUsers({ perPage: ids.length });
  const emailById: Record<string,string> = {};
  users?.forEach(u => (emailById[u.id] = u.email!));

  let sent = 0;
  for (const cls of classes) {
    const when = new Date(cls.start_time).toLocaleString();

    await resend.emails.send({
      from: 'Qurʼan Tutor <noreply@qurantutor.com>',
      to: emailById[cls.scholar_id],
      subject: `Reminder: Your class "${cls.title}" is tomorrow`,
      html: `<p>You teach <strong>${cls.title}</strong> at ${when}.</p>`
    });
    sent++;

    for (const e of cls.enrolments) {
      await resend.emails.send({
        from: 'Qurʼan Tutor <noreply@qurantutor.com>',
        to: emailById[e.learner_id],
        subject: `Reminder: "${cls.title}" is tomorrow`,
        html: `<p>Assalaamu ʿalaykum!<br/>Reminder that <strong>${cls.title}</strong> starts at ${when}.</p>`
      });
      sent++;
    }
  }

  return NextResponse.json({ sent });
}
