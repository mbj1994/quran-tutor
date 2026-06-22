import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe';

type PaymentRecord = Record<string, string | number | null>;
type StripeRef = string | { id: string } | null | undefined;
type CheckoutMetadata = Record<string, string> | null | undefined;
type CheckoutSession = {
  id: string;
  metadata?: CheckoutMetadata;
  customer?: StripeRef;
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

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function getPaymentStore() {
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');

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
    throw new Error(
      'Stripe subscription checkout session metadata.user_id is missing.'
    );
  }

  const stripe = getStripe();
  const supabase = getPaymentStore();
  const subscription = (await stripe.subscriptions.retrieve(
    subscriptionId
  )) as unknown as StripeSubscription;
  const customerId = getStripeId(subscription.customer) ?? getStripeId(session.customer);
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

export async function storeStripeCheckoutSession(sessionId: string) {
  getRequiredEnv('STRIPE_SECRET_KEY');

  const session = (await getStripe().checkout.sessions.retrieve(
    sessionId,
    {
      expand: ['customer', 'payment_intent', 'subscription'],
    }
  )) as unknown as CheckoutSession;
  const paymentType = session.metadata?.type;

  if (!paymentType) {
    throw new Error('Stripe checkout session metadata.type is missing.');
  }

  if (paymentType === 'donation') {
    await upsertDonation(session);
    return { type: paymentType };
  }

  if (paymentType === 'subscription') {
    await upsertSubscription(session);
    return { type: paymentType };
  }

  throw new Error(
    `Stripe checkout session metadata.type is unsupported: ${paymentType}.`
  );
}
