-- ---------- TABLE: classes ----------
create table public.classes (
  id            uuid primary key default gen_random_uuid(),
  scholar_id    uuid not null references public.profiles on delete cascade,
  title         text not null,
  start_time    timestamptz not null,
  duration_min  integer not null default 60,
  capacity      integer not null default 20,
  created_at    timestamptz default now()
);

comment on table public.classes is 'One row per scheduled class (live or recorded)';
comment on column public.classes.scholar_id is 'FK → profiles.id (role = scholar)';

-- ---------- TABLE: enrolments ----------
create table public.enrolments (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes on delete cascade,
  learner_id   uuid not null references public.profiles on delete cascade,
  status       text not null default 'booked',  -- booked | attended | cancelled
  created_at   timestamptz default now(),
  unique (class_id, learner_id)
);

-- ---------- RLS ----------
alter table public.classes    enable row level security;
alter table public.enrolments enable row level security;

-- 1) Scholars can CRUD only their own classes
create policy "Scholar owns class"
on public.classes
  for all
  using  ( scholar_id = auth.uid() )
  with check ( scholar_id = auth.uid() );

-- 2) Anyone can view future public class listings
create policy "Public select"
on public.classes
  for select
  using ( start_time > now() - interval '30 minutes' );

-- 3) Enrolments: learner or scholar of that class
create policy "Enrolment read/write"
on public.enrolments
  for all
  using (
    auth.uid() = learner_id
    or auth.uid() = (select scholar_id from public.classes where id = class_id)
  )
  with check ( auth.uid() = learner_id );

-- ---------- Trigger: default scholar_id ----------
create function public.handle_new_class()
returns trigger as $$
begin
  if new.scholar_id is null then
    new.scholar_id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger set_scholar_before_insert
before insert on public.classes
for each row execute procedure public.handle_new_class();
