import { NextRequest, NextResponse } from 'next/server';
import { storeStripeCheckoutSession } from '@/lib/payments/storeStripeCheckout';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export async function POST(req: NextRequest) {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  try {
    const body: unknown = await req.json();
    const sessionId =
      typeof body === 'object' && body !== null && 'sessionId' in body
        ? body.sessionId
        : undefined;

    if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
      return NextResponse.json(
        {
          ok: false,
          error: 'A valid Stripe checkout sessionId is required.',
        },
        { status: 400 }
      );
    }

    if (isDevelopment) {
      console.log('Stripe sync-session received sessionId:', sessionId);
    }

    await storeStripeCheckoutSession(sessionId);

    if (isDevelopment) {
      console.log('Stripe sync-session storage succeeded:', sessionId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Unable to sync Stripe checkout session:', error);

    const errorMessage = getErrorMessage(error);

    return NextResponse.json(
      {
        ok: false,
        error: isDevelopment
          ? `Unable to record Stripe checkout session: ${errorMessage}`
          : 'Unable to record Stripe checkout session.',
      },
      { status: 500 }
    );
  }
}
