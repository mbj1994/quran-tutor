create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  learner_profile_id uuid not null references public.learners(id) on delete cascade,
  scholar_id uuid not null references public.profiles(id) on delete cascade,
  notes text,
  attendance_status text not null default 'present',
  homework text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (class_id, learner_profile_id)
);

alter table public.lesson_progress enable row level security;

create or replace function public.handle_lesson_progress_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_lesson_progress_updated_at
before update on public.lesson_progress
for each row execute procedure public.handle_lesson_progress_updated_at();

create policy "Scholars can select own class progress"
on public.lesson_progress
  for select
  using (
    exists (
      select 1
      from public.classes
      where classes.id = lesson_progress.class_id
        and classes.scholar_id = auth.uid()
    )
  );

create policy "Parents can select own learner progress"
on public.lesson_progress
  for select
  using ( public.parent_owns_learner(learner_profile_id) );

create policy "Scholars can insert own class progress"
on public.lesson_progress
  for insert
  with check (
    scholar_id = auth.uid()
    and exists (
      select 1
      from public.classes
      where classes.id = lesson_progress.class_id
        and classes.scholar_id = auth.uid()
    )
  );

create policy "Scholars can update own class progress"
on public.lesson_progress
  for update
  using (
    exists (
      select 1
      from public.classes
      where classes.id = lesson_progress.class_id
        and classes.scholar_id = auth.uid()
    )
  )
  with check (
    scholar_id = auth.uid()
    and exists (
      select 1
      from public.classes
      where classes.id = lesson_progress.class_id
        and classes.scholar_id = auth.uid()
    )
  );
