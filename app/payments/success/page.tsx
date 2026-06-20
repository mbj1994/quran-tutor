import Link from 'next/link';

export default function PaymentSuccessPage() {
  return (
    <main className="mx-auto max-w-md p-6 text-center space-y-4">
      <h1 className="text-2xl font-semibold">Payment successful</h1>
      <p>Thank you. Your payment was completed successfully.</p>
      <Link href="/" className="underline">
        Go back home
      </Link>
    </main>
  );
}