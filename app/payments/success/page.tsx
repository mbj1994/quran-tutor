import { PaymentSuccessClient } from './PaymentSuccessClient';

type PaymentSuccessPageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

export default async function PaymentSuccessPage({
  searchParams,
}: PaymentSuccessPageProps) {
  const { session_id: sessionId } = await searchParams;

  return <PaymentSuccessClient sessionId={sessionId} />;
}
