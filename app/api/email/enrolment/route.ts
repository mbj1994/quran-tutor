export const runtime = 'nodejs';   // keep if you added it

import { NextRequest, NextResponse } from 'next/server';
import { resend } from '@/lib/resend';

export async function POST(req: NextRequest) {
  const { record } = await req.json();

  // Pull env vars
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SB_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Minimal (no-Docker) Supabase client
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(SB_URL, SB_SERVICE);

  // Fetch email + class info
  const [{ data: user }, { data: cls }] = await Promise.all([
    sb.auth.admin.getUserById(record.learner_id),
    sb
      .from('classes')
      .select('title,start_time')
      .eq('id', record.class_id)
      .single(),
  ]);

  // …inside POST handler, after fetching `user` and `cls`
  const email = user?.email;
  if (!email) {
    console.warn('[email-route] user has no email', record.learner_id);
    return NextResponse.json({ status: 'no-email' }, { status: 400 });
  }

  await resend.emails.send({
    from: 'Qurʼan Tutor <onboarding@resend.dev>',   // or your verified sender
    to: email,                                      // ← no “!”
    subject: 'Class booking confirmed',
    html: `<p>Assalaamu ʿalaykum!</p>
          <p>Your booking for <strong>${cls!.title}</strong> on
          ${new Date(cls!.start_time).toLocaleString()} is confirmed.</p>`,
  });


  return NextResponse.json({ status: 'sent' });
}
