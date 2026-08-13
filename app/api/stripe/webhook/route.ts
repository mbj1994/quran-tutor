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
  status?: string | null;
  payment_status?: string | null;
  mode?: string | null;
  metadata?: Record<string, string> | null;
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

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded' ||
    event.type === 'checkout.session.async_payment_failed'
  ) {
    const session = event.data.object as CheckoutSession;

    console.info('Stripe Checkout Session webhook:', {
      checkoutType: session.metadata?.type,
      sessionStatus: session.status,
      paymentStatus: session.payment_status,
      sessionMode: session.mode,
      eventType: event.type,
    });

    const isDonation = session.metadata?.type === 'donation';
    const isSubscription = session.metadata?.type === 'subscription';
    const isUnpaidDonation = isDonation && session.payment_status === 'unpaid';
    const shouldWaitForDonationPayment =
      event.type === 'checkout.session.completed' && isUnpaidDonation;
    const asyncPaymentFailed =
      event.type === 'checkout.session.async_payment_failed';

    if (shouldWaitForDonationPayment || (asyncPaymentFailed && isDonation)) {
      return NextResponse.json({ received: true });
    }

    try {
      await storeStripeCheckoutSession(
        session.id,
        asyncPaymentFailed && isSubscription
          ? { subscriptionStatus: 'inactive' }
          : undefined
      );
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
