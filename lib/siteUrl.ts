function normalizeOrigin(value: string | undefined | null) {
  if (!value) return null;

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    return new URL(candidate).origin;
  } catch {
    return null;
  }
}

const LOCAL_SITE_ORIGIN = 'http://localhost:3000';
const PRODUCTION_SITE_ORIGIN = 'https://quran-tutor-sigma.vercel.app';

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
  const configuredOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL);

  if (process.env.NODE_ENV === 'production') {
    return configuredOrigin && !isLocalOrigin(configuredOrigin)
      ? configuredOrigin
      : PRODUCTION_SITE_ORIGIN;
  }

  return runtimeOrigin && isLocalOrigin(runtimeOrigin)
    ? runtimeOrigin
    : LOCAL_SITE_ORIGIN;
}

export function getServerSiteOrigin(
  requestUrl: string,
  requestOrigin?: string | null
) {
  const productionCandidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
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

  if (process.env.NODE_ENV === 'production') {
    return PRODUCTION_SITE_ORIGIN;
  }

  const fallbackOrigins = [
    normalizeOrigin(requestOrigin),
    normalizeOrigin(requestUrl),
  ];

  for (const origin of fallbackOrigins) {
    if (origin) {
      return origin;
    }
  }

  return LOCAL_SITE_ORIGIN;
}
