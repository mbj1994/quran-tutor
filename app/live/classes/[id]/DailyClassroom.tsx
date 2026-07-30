'use client';

import DailyIframe, { type DailyCall } from '@daily-co/daily-js';
import { useEffect, useRef, useState } from 'react';

let dailyFrameOperation = Promise.resolve();

async function destroyCall(call: DailyCall) {
  await call.leave().catch(() => undefined);
  await call.destroy().catch(() => undefined);
}

export default function DailyClassroom({
  roomUrl,
  token,
}: {
  roomUrl: string;
  token: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCall | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = frameRef.current;
    if (!roomUrl || !container || callRef.current) return;

    let cancelled = false;
    let effectCall: DailyCall | null = null;

    dailyFrameOperation = dailyFrameOperation
      .catch(() => undefined)
      .then(async () => {
        if (cancelled || callRef.current) return;

        const existingCall = DailyIframe.getCallInstance();
        if (existingCall) {
          await destroyCall(existingCall);
        }

        if (cancelled || callRef.current) return;

        container.replaceChildren();

        const call = DailyIframe.createFrame(container, {
          showLeaveButton: true,
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: '0',
            borderRadius: '1rem',
          },
        });

        effectCall = call;
        callRef.current = call;
        call.on('error', () => {
          if (!cancelled) setFailed(true);
        });

        try {
          await call.join({ url: roomUrl, token });
        } catch {
          if (!cancelled) setFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;

      dailyFrameOperation = dailyFrameOperation
        .catch(() => undefined)
        .then(async () => {
          const call = effectCall ?? callRef.current;
          if (!call) return;

          await destroyCall(call);

          if (callRef.current === call) {
            callRef.current = null;
          }
          effectCall = null;
          container.replaceChildren();
        });
    };
  }, [roomUrl, token]);

  if (failed) {
    return (
      <div className="flex h-[clamp(24rem,68svh,44rem)] items-center justify-center rounded-2xl bg-gray-950 p-4 text-center text-white sm:p-6">
        <div>
          <p className="text-lg font-semibold">
            We could not open the classroom right now.
          </p>
          <p className="mt-2 text-sm text-gray-300">
            Please use the backup class link below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={frameRef}
      className="h-[clamp(24rem,68svh,44rem)] w-full overflow-hidden rounded-2xl bg-gray-950"
    />
  );
}
