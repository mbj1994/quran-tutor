'use client';

import DailyIframe, { type DailyCall } from '@daily-co/daily-js';
import { useEffect, useRef, useState } from 'react';

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
    if (!frameRef.current) return;

    const call = DailyIframe.createFrame(frameRef.current, {
      showLeaveButton: true,
      iframeStyle: {
        width: '100%',
        height: '100%',
        border: '0',
        borderRadius: '1rem',
      },
    });

    callRef.current = call;
    call.on('error', () => setFailed(true));
    call.join({ url: roomUrl, token }).catch(() => setFailed(true));

    return () => {
      callRef.current = null;
      call.destroy();
    };
  }, [roomUrl, token]);

  if (failed) {
    return (
      <div className="flex min-h-[32rem] items-center justify-center rounded-2xl bg-gray-950 p-6 text-center text-white">
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
      className="min-h-[32rem] overflow-hidden rounded-2xl bg-gray-950 sm:min-h-[38rem]"
    />
  );
}
