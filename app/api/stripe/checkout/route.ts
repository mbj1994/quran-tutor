import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

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

    const price =
      type === 'donation'
        ? process.env.NEXT_PUBLIC_STRIPE_DONATION_PRICE
        : process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY;

    if (!price) {
      const priceName =
        type === 'donation'
          ? 'NEXT_PUBLIC_STRIPE_DONATION_PRICE'
          : 'NEXT_PUBLIC_STRIPE_PRICE_MONTHLY';

      return NextResponse.json(
        { error: `${priceName} is not configured on the server.` },
        { status: 500 }
      );
    }

    let user: { id: string; email?: string | null } | null = null;
    const sb = createRouteHandlerClient({ cookies });
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

    const origin =
      req.headers.get('origin') ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      new URL(req.url).origin;

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

    const session = await getStripe().checkout.sessions.create({
      mode: type === 'donation' ? 'payment' : 'subscription',
      line_items: [{ price, quantity: 1 }],
      customer,
      customer_email: customer ? undefined : (user?.email ?? undefined),
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
