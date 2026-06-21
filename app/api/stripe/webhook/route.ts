import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe';

type PaymentRecord = Record<string, string | number | null>;
type CheckoutMetadata = Record<string, string> | null | undefined;
type StripeRef = string | { id: string } | null | undefined;
type StripeEvent = {
  type: string;
  data: {
    object: unknown;
  };
};
type CheckoutSession = {
  id: string;
  metadata?: CheckoutMetadata;
  payment_intent?: StripeRef;
  subscription?: StripeRef;
  amount_total?: number | null;
  currency?: string | null;
  customer_email?: string | null;
  customer_details?: {
    email?: string | null;
  } | null;
};
type StripeSubscription = {
  id: string;
  customer?: StripeRef;
  status: string;
  current_period_end?: number | null;
  items?: {
    data?: Array<{
      current_period_end?: number | null;
    }>;
  };
};

function getPaymentStore() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service role is not configured.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

function getStripeId(value: StripeRef) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

function getMetadataUserId(metadata: CheckoutMetadata) {
  const userId = metadata?.user_id;
  return userId ? userId : null;
}

function getTimestamp(timestamp?: number | null) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

function getCheckoutCustomerEmail(session: CheckoutSession) {
  return session.customer_details?.email || session.customer_email || null;
}

async function upsertDonation(session: CheckoutSession) {
  const supabase = getPaymentStore();
  const paymentIntentId = getStripeId(session.payment_intent);

  const donation: PaymentRecord = {
    user_id: getMetadataUserId(session.metadata),
    stripe_checkout_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId,
    amount_total: session.amount_total ?? null,
    currency: session.currency ?? null,
    donor_email: getCheckoutCustomerEmail(session),
  };

  const { error } = await supabase
    .from('donations')
    .upsert(donation, { onConflict: 'stripe_checkout_session_id' });

  if (error) throw error;
}

async function upsertSubscription(session: CheckoutSession) {
  const subscriptionId = getStripeId(session.subscription);
  const userId = getMetadataUserId(session.metadata);

  if (!subscriptionId) {
    throw new Error('Stripe checkout session is missing a subscription id.');
  }

  if (!userId) {
    throw new Error('Stripe subscription checkout session is missing user_id metadata.');
  }

  const stripe = getStripe();
  const supabase = getPaymentStore();
  const subscription = (await stripe.subscriptions.retrieve(
    subscriptionId
  )) as unknown as StripeSubscription;
  const customerId = getStripeId(subscription.customer);
  const currentPeriodEnd =
    subscription.current_period_end ??
    subscription.items?.data?.[0]?.current_period_end ??
    null;

  const subscriptionRecord: PaymentRecord = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    current_period_end: getTimestamp(currentPeriodEnd),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('subscriptions')
    .upsert(subscriptionRecord, { onConflict: 'stripe_subscription_id' });

  if (error) throw error;
}

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
    const paymentType = session.metadata?.type;

    try {
      if (paymentType === 'donation') {
        await upsertDonation(session);
      } else if (paymentType === 'subscription') {
        await upsertSubscription(session);
      } else {
        console.log('Stripe checkout completed with unknown metadata type:', {
          sessionId: session.id,
          type: paymentType ?? null,
        });
      }
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
