alter table public.learners
  add column if not exists points integer not null default 0,
  add column if not exists lessons_completed integer not null default 0,
  add column if not exists current_badge text;
