// Future UI translations can support these app languages. Do not add
// machine-translated religious text without human review.
export const appLanguages = [
  'English',
  'Mandinka',
  'Wolof',
  'Fula',
  'Arabic',
] as const;

export type AppLanguage = (typeof appLanguages)[number];
