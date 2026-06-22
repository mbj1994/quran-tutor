-- ---------- TABLE: learners ----------
create table public.learners (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  age integer,
  preferred_language text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- RLS ----------
alter table public.learners enable row level security;

create policy "Parents can select own learners"
on public.learners
  for select
  using ( parent_id = auth.uid() );

create policy "Parents can insert own learners"
on public.learners
  for insert
  with check ( parent_id = auth.uid() );

create policy "Parents can update own learners"
on public.learners
  for update
  using ( parent_id = auth.uid() )
  with check ( parent_id = auth.uid() );

create policy "Parents can delete own learners"
on public.learners
  for delete
  using ( parent_id = auth.uid() );
