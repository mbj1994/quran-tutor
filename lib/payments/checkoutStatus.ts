export type CheckoutConfirmationState = 'success' | 'pending' | 'error';

export function getCheckoutConfirmationState(
  sessionStatus: string | null | undefined,
  paymentStatus: string | null | undefined
): CheckoutConfirmationState {
  if (sessionStatus !== 'complete') {
    return 'error';
  }

  if (paymentStatus === 'paid' || paymentStatus === 'no_payment_required') {
    return 'success';
  }

  if (paymentStatus === 'unpaid') {
    return 'pending';
  }

  return 'error';
}
