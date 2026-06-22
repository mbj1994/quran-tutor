import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { storeStripeCheckoutSession } from '@/lib/payments/storeStripeCheckout';

type StripeEvent = {
  type: string;
  data: {
    object: unknown;
  };
};
type CheckoutSession = {
  id: string;
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
    ) as StripeEvent;
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid Stripe webhook signature.' },
      { status: 400 }
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as CheckoutSession;

    try {
      await storeStripeCheckoutSession(session.id);
    } catch (error) {
      console.error('Unable to store Stripe checkout result:', error);
      return NextResponse.json(
        { error: 'Unable to store Stripe checkout result.' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
