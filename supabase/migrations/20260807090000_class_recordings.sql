-- Private lesson recording links for a specific booked class.
create table public.class_recordings (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  learner_id uuid references public.learners(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  recording_url text not null check (recording_url ~* '^https?://'),
  source text not null default 'external'
    check (source in ('external', 'daily')),
  visibility text not null default 'class'
    check (visibility = 'class'),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now()
);

create index class_recordings_class_id_idx
on public.class_recordings (class_id, created_at desc);

alter table public.class_recordings enable row level security;

-- SECURITY DEFINER helpers keep old/private classes accessible to their own
-- scholar and booked parents without depending on broader classes RLS rules.
create or replace function public.scholar_owns_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.classes c
    where c.id = target_class_id
      and c.scholar_id = auth.uid()
  );
$$;

create or replace function public.parent_booked_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.enrolments e
    join public.learners l on l.id = e.learner_profile_id
    where e.class_id = target_class_id
      and l.parent_id = auth.uid()
  );
$$;

revoke all on function public.scholar_owns_class(uuid) from public;
revoke all on function public.parent_booked_class(uuid) from public;
grant execute on function public.scholar_owns_class(uuid) to authenticated;
grant execute on function public.parent_booked_class(uuid) to authenticated;

create policy "Scholars can select own class recordings"
on public.class_recordings for select to authenticated
using (public.scholar_owns_class(class_id));

create policy "Scholars can insert own class recordings"
on public.class_recordings for insert to authenticated
with check (
  created_by = auth.uid()
  and public.scholar_owns_class(class_id)
);

create policy "Scholars can update own class recordings"
on public.class_recordings for update to authenticated
using (public.scholar_owns_class(class_id))
with check (
  created_by = auth.uid()
  and public.scholar_owns_class(class_id)
);

create policy "Scholars can delete own class recordings"
on public.class_recordings for delete to authenticated
using (public.scholar_owns_class(class_id));

create policy "Parents can select booked class recordings"
on public.class_recordings for select to authenticated
using (
  public.parent_booked_class(class_id)
  and (
    learner_id is null
    or public.parent_owns_learner(learner_id)
  )
);

create policy "Admins can manage class recordings"
on public.class_recordings for all to authenticated
using (public.is_admin())
with check (public.is_admin());

revoke all on table public.class_recordings from anon;
grant select, insert, update, delete on table public.class_recordings
to authenticated;
grant all on table public.class_recordings to service_role;

-- TODO: Link recordings to explicit parent consent when a consent field or
-- workflow is introduced. Phase 12 keeps recording manual and scholar-only.
