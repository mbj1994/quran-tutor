import Link from 'next/link';

export default function PaymentCancelPage() {
  return (
    <main className="mx-auto max-w-md p-6 text-center space-y-4">
      <h1 className="text-2xl font-semibold">Payment cancelled</h1>
      <p>No payment was made. You can try again anytime.</p>
      <Link href="/payments" className="underline">
        Return to payments
      </Link>
    </main>
  );
}