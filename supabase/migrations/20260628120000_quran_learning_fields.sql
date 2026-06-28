alter table public.learners
  add column if not exists quran_level text,
  add column if not exists learning_goals text;

alter table public.classes
  add column if not exists subject text,
  add column if not exists level text,
  add column if not exists language text,
  add column if not exists description text,
  add column if not exists meeting_url text;
