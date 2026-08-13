function normalizeOrigin(value: string | undefined | null) {
  if (!value) return null;

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

function isLocalOrigin(value: string) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function getBrowserSiteOrigin() {
  const runtimeOrigin =
    typeof window === 'undefined' ? null : normalizeOrigin(window.location.origin);
  const configuredOrigin = normalizeOrigin(
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL
  );

  if (
    process.env.NODE_ENV === 'production' &&
    configuredOrigin &&
    isLocalOrigin(configuredOrigin)
  ) {
    return runtimeOrigin ?? configuredOrigin;
  }

  return configuredOrigin ?? runtimeOrigin ?? 'http://localhost:3000';
}

export function getServerSiteOrigin(
  requestUrl: string,
  requestOrigin?: string | null
) {
  const productionCandidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BASE_URL,
    process.env.VERCEL_URL,
  ];
  const developmentCandidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
  ];
  const candidates =
    process.env.NODE_ENV === 'production'
      ? productionCandidates
      : developmentCandidates;

  for (const candidate of candidates) {
    const origin = normalizeOrigin(candidate);
    if (origin && (process.env.NODE_ENV !== 'production' || !isLocalOrigin(origin))) {
      return origin;
    }
  }

  const fallbackOrigins = [
    normalizeOrigin(requestOrigin),
    normalizeOrigin(requestUrl),
  ];

  for (const origin of fallbackOrigins) {
    if (origin && (process.env.NODE_ENV !== 'production' || !isLocalOrigin(origin))) {
      return origin;
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('A production site URL is not configured.');
  }

  return 'http://localhost:3000';
}
