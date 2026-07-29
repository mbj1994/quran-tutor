import 'server-only';

const DAILY_API_BASE = 'https://api.daily.co/v1';

type DailyRoom = {
  name: string;
  url: string;
};

type DailyToken = {
  token: string;
};

export type DailyClassroom = {
  roomUrl: string;
  token: string;
};

export class DailyConfigurationError extends Error {}

function getDailyApiKey() {
  const apiKey = process.env.DAILY_API_KEY;

  if (!apiKey) {
    throw new DailyConfigurationError('Missing Daily API key.');
  }

  return apiKey;
}

function getConfiguredRoomUrl(roomName: string) {
  const configuredBase =
    process.env.DAILY_BASE_URL ?? process.env.DAILY_DOMAIN ?? '';

  if (!configuredBase) return null;

  const withProtocol = /^https?:\/\//i.test(configuredBase)
    ? configuredBase
    : `https://${configuredBase}`;

  return `${withProtocol.replace(/\/+$/, '')}/${roomName}`;
}

async function dailyRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${DAILY_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getDailyApiKey()}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Daily API request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

async function getOrCreateRoom(roomName: string) {
  const existingResponse = await fetch(
    `${DAILY_API_BASE}/rooms/${encodeURIComponent(roomName)}`,
    {
      headers: {
        Authorization: `Bearer ${getDailyApiKey()}`,
      },
      cache: 'no-store',
    }
  );

  if (existingResponse.ok) {
    return (await existingResponse.json()) as DailyRoom;
  }

  if (existingResponse.status !== 404) {
    throw new Error(
      `Daily room lookup failed with status ${existingResponse.status}.`
    );
  }

  return dailyRequest<DailyRoom>('/rooms', {
    method: 'POST',
    body: JSON.stringify({
      name: roomName,
      privacy: 'private',
      properties: {
        enable_prejoin_ui: true,
        enable_people_ui: true,
      },
    }),
  });
}

export async function createDailyClassroom({
  classId,
  participantName,
  isOwner,
}: {
  classId: string;
  participantName: string;
  isOwner: boolean;
}): Promise<DailyClassroom> {
  const roomName = `quran-tutor-class-${classId}`;
  const room = await getOrCreateRoom(roomName);
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 4;
  const meetingToken = await dailyRequest<DailyToken>('/meeting-tokens', {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: participantName,
        is_owner: isOwner,
        exp: expiresAt,
        eject_at_token_exp: true,
        enable_prejoin_ui: true,
      },
    }),
  });

  const roomUrl = room.url || getConfiguredRoomUrl(roomName);

  if (!roomUrl) {
    throw new DailyConfigurationError('Missing Daily room domain.');
  }

  return {
    roomUrl,
    token: meetingToken.token,
  };
}
