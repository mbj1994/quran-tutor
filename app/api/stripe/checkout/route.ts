import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createRouteHandlerSupabaseClient } from '@/lib/supabaseServer';
import { getServerSiteOrigin } from '@/lib/siteUrl';

const MIN_DONATION_CENTS = 100;
const MAX_DONATION_CENTS = 1_000_000;

function getBodyValue(body: unknown, key: string) {
  return typeof body === 'object' && body !== null && key in body
    ? (body as Record<string, unknown>)[key]
    : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const type =
      typeof body === 'object' && body !== null && 'type' in body
        ? body.type
        : undefined;

    if (type !== 'subscription' && type !== 'donation') {
      return NextResponse.json(
        { error: 'Invalid checkout type.' },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured on the server.' },
        { status: 500 }
      );
    }

    const subscriptionPrice = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY;

    if (type === 'subscription' && !subscriptionPrice) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_STRIPE_PRICE_MONTHLY is not configured on the server.' },
        { status: 500 }
      );
    }

    const amountCents = getBodyValue(body, 'amountCents');
    if (
      type === 'donation' &&
      (!Number.isInteger(amountCents) ||
        Number(amountCents) < MIN_DONATION_CENTS ||
        Number(amountCents) > MAX_DONATION_CENTS)
    ) {
      return NextResponse.json(
        { error: 'Enter a valid donation amount between $1 and $10,000.' },
        { status: 400 }
      );
    }

    const suppliedDonorEmail = getBodyValue(body, 'donorEmail');
    const donorEmail =
      typeof suppliedDonorEmail === 'string'
        ? suppliedDonorEmail.trim().toLowerCase()
        : '';

    if (
      type === 'donation' &&
      donorEmail &&
      (donorEmail.length > 320 || !/^\S+@\S+\.\S+$/.test(donorEmail))
    ) {
      return NextResponse.json(
        { error: 'Enter a valid email address for the donation receipt.' },
        { status: 400 }
      );
    }

    let user: { id: string; email?: string | null } | null = null;
    const sb = await createRouteHandlerSupabaseClient();
    const {
      data: { user: authenticatedUser },
    } = await sb.auth.getUser();

    if (type === 'subscription') {
      if (!authenticatedUser) {
        return NextResponse.json(
          { error: 'Please log in first.' },
          { status: 401 }
        );
      }
    }

    user = authenticatedUser;

    if (type === 'donation' && !user?.email && !donorEmail) {
      return NextResponse.json(
        { error: 'Enter an email address for the donation receipt.' },
        { status: 400 }
      );
    }

    const origin = getServerSiteOrigin(req.url, req.headers.get('origin'));

    let customer: string | undefined;

    if (type === 'subscription' && user) {
      const { data: existingSubscription, error: customerLookupError } =
        await sb
          .from('subscriptions')
          .select('stripe_customer_id')
          .eq('user_id', user.id)
          .not('stripe_customer_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle<{ stripe_customer_id: string | null }>();

      if (customerLookupError) {
        console.error(
          'Unable to look up the authenticated user Stripe customer:',
          customerLookupError
        );
        return NextResponse.json(
          { error: 'Unable to start checkout. Please try again.' },
          { status: 500 }
        );
      }

      customer = existingSubscription?.stripe_customer_id ?? undefined;

      if (!customer) {
        const stripeCustomer = await getStripe().customers.create({
          email: user.email ?? undefined,
          metadata: { user_id: user.id },
        });
        customer = stripeCustomer.id;
      }
    }

    const lineItems =
      type === 'donation'
        ? [
            {
              price_data: {
                currency: 'usd' as const,
                product_data: {
                  name: 'Donation to Quran Tutor',
                },
                unit_amount: Number(amountCents),
              },
              quantity: 1,
            },
          ]
        : [{ price: subscriptionPrice as string, quantity: 1 }];

    const session = await getStripe().checkout.sessions.create({
      mode: type === 'donation' ? 'payment' : 'subscription',
      line_items: lineItems,
      customer,
      customer_email: customer
        ? undefined
        : ((user?.email ?? donorEmail) || undefined),
      metadata: {
        user_id: user?.id ?? '',
        type,
      },
      success_url:
        type === 'donation'
          ? `${origin}/donation?session_id={CHECKOUT_SESSION_ID}`
          : `${origin}/subscription?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payments/cancel`,
    });

    console.info('Stripe Checkout Session created:', {
      sessionId: session.id,
      mode: session.mode,
      status: session.status,
      paymentStatus: session.payment_status,
      purpose: session.metadata?.purpose ?? session.metadata?.type,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Stripe did not return a checkout URL.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout failed:', error);
    return NextResponse.json(
      { error: 'Unable to start checkout. Please try again.' },
      { status: 500 }
    );
  }
}
