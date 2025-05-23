-- ----------  CLASSES  ----------
create table public.classes (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  starts_at     timestamptz not null,
  duration_min  integer not null check (duration_min > 0),
  capacity      integer not null check (capacity > 0),
  meeting_link  text,
  scholar_id    uuid not null references public.profiles on delete cascade,
  created_at    timestamptz default now()
);

-- Only show future classes by default
create index on public.classes (starts_at);

-- ----------  ENROLMENTS  ----------
create table public.enrolments (
  class_id   uuid references public.classes on delete cascade,
  user_id    uuid references public.profiles on delete cascade,
  created_at timestamptz default now(),
  primary key (class_id, user_id)
);

-- ----------  ROW-LEVEL SECURITY  ----------
alter table public.classes    enable row level security;
alter table public.enrolments enable row level security;

-- Scholars (role 'scholar') may insert/read/update their own classes
create policy "Scholars manage own classes"
  on public.classes
  for all
  using  (auth.uid() = scholar_id)
  with check (auth.uid() = scholar_id);

-- Everyone can view (select) non-private columns of future classes
create policy "Public read classes"
  on public.classes
  for select
  using (starts_at > now());

-- Learners/parents can enrol themselves / their children
create policy "Anyone inserts enrolment"
  on public.enrolments
  for insert
  with check (auth.uid() = user_id);

-- Users can read their own enrolments
create policy "Read own enrolments"
  on public.enrolments
  for select
  using (auth.uid() = user_id);

-- Optional: prevent over-booking (capacity guard)
create function public.enforce_capacity()
returns trigger as $$
begin
  if (select count(*) from public.enrolments where class_id = NEW.class_id) >=
     (select capacity from public.classes where id = NEW.class_id) then
       raise exception 'Class is full';
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_enrolment_capacity
  before insert on public.enrolments
  for each row execute function public.enforce_capacity();
