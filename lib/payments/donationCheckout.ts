import type { Checkout } from 'stripe';

export const MIN_DONATION_CENTS = 100;
export const MAX_DONATION_CENTS = 1_000_000;

export function normalizeDonationEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isValidDonationEmail(email: string) {
  return email.length <= 320 && /^\S+@\S+\.\S+$/.test(email);
}

export function isValidDonationAmount(amountCents: unknown) {
  return (
    Number.isInteger(amountCents) &&
    Number(amountCents) >= MIN_DONATION_CENTS &&
    Number(amountCents) <= MAX_DONATION_CENTS
  );
}

export function resolveDonationReceiptEmail(
  suppliedDonorEmail: unknown,
  authenticatedEmail: unknown
) {
  return (
    normalizeDonationEmail(suppliedDonorEmail) ||
    normalizeDonationEmail(authenticatedEmail)
  );
}

export function buildDonationCheckoutSessionParams({
  amountCents,
  donorEmail,
  userId,
  siteUrl,
}: {
  amountCents: number;
  donorEmail: string;
  userId?: string;
  siteUrl: string;
}): Checkout.SessionCreateParams {
  return {
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Quran Tutor Donation',
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    customer_email: donorEmail,
    metadata: {
      ...(userId ? { user_id: userId } : {}),
      type: 'donation',
      purpose: 'donation',
      donor_email: donorEmail,
      amount_cents: String(amountCents),
    },
    success_url: `${siteUrl}/donation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/donation`,
  };
}
