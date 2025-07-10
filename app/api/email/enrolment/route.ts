// app/api/email/enrolment/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const { record } = await req.json();

    const resend = new Resend(process.env.RESEND_API_KEY!);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ── fetch user + class ────────────────────────────────────────────────
    const [{ data: userData }, { data: cls, error: clsErr }] = await Promise.all([
      supabase.auth.admin.getUserById(record.learner_id),
      supabase
        .from('classes')
        .select('title,start_time,duration_min')
        .eq('id', record.class_id)
        .single(),
    ]);

    if (clsErr) throw clsErr;

    const email = userData?.user?.email;
    if (!email) {
      console.warn('[email-route] user has no email', record.learner_id);
      return NextResponse.json({ status: 'no-email' }, { status: 400 });
    }

    // ── send email ────────────────────────────────────────────────────────
    await resend.emails.send({
      from: 'Qurʼan Tutor <onboarding@resend.dev>',
      to: email,
      subject: 'Class booking confirmed',
      html: `<p>Assalaamu ʿalaykum!</p>
             <p>Your booking for <strong>${cls!.title}</strong> on
             ${new Date(cls!.start_time).toLocaleString()} is confirmed.</p>`,
    });

    return NextResponse.json({ status: 'sent' });
  } catch (err) {
    console.error('[email-route] failed', err);
    return NextResponse.json(
      { status: 'error', message: (err as Error).message },
      { status: 500 }
    );
  }
}
