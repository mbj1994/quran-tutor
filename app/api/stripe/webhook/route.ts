import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

type StripeEvent = {
  type: string;
  data: {
    object: unknown;
  };
};

type CheckoutSession = {
  id: string;
  metadata?: Record<string, string> | null;
  payment_status?: string | null;
  subscription?: string | { id: string } | null;
};

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get('stripe-signature');

  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook is not configured on the server.' },
      { status: 500 }
    );
  }

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing Stripe signature.' },
      { status: 400 }
    );
  }

  let event: StripeEvent;

  try {
    const rawBody = await req.text();
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid Stripe webhook signature.' },
      { status: 400 }
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as CheckoutSession;
    const paymentType = session.metadata?.type;

    if (paymentType === 'donation') {
      console.log('Stripe donation checkout completed:', {
        sessionId: session.id,
        paymentStatus: session.payment_status,
      });
    } else if (paymentType === 'subscription') {
      console.log('Stripe subscription checkout completed:', {
        sessionId: session.id,
        subscriptionId:
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id,
        userId: session.metadata?.user_id || null,
      });
    } else {
      console.log('Stripe checkout completed with unknown metadata type:', {
        sessionId: session.id,
        type: paymentType ?? null,
      });
    }
  }

  return NextResponse.json({ received: true });
}
