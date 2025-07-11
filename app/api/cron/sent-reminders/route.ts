import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { resend } from '@/lib/resend';

export async function GET() {
  const sb = createServerComponentClient({ cookies });

  // 24–25 h window to avoid duplicates in hourly job
  const from = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const to   = new Date(Date.now() + 25 * 60 * 60 * 1000);

  const { data: classes } = await sb
    .from('classes')
    .select('id,title,start_time, scholar_id, profiles(email)')
    .gte('start_time', from.toISOString())
    .lt('start_time',  to.toISOString());

  if (!classes || classes.length === 0) {
    return NextResponse.json({ status: 'no-class' });
  }

  // Send one email per class
  await Promise.all(
    classes.map((c) =>
      resend.emails.send({
        from: 'Qurʼan Tutor <noreply@noreply.qurantutor.com>',
        to:   c.profiles.email,
        subject: 'Reminder: Your class starts in 24 h',
        html: `<p>Assalaamu ʿalaykum!</p>
               <p>This is a friendly reminder that your session
               <strong>${c.title}</strong> starts at
               ${new Date(c.start_time).toLocaleString()}.</p>`
      })
    )
  );

  return NextResponse.json({ status: 'sent', count: classes.length });
}
