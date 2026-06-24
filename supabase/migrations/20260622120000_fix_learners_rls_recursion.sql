drop policy if exists "Scholars can select learners enrolled in own classes"
on public.learners;

drop policy if exists "Parents can select own learners"
on public.learners;
drop policy if exists "Parents can insert own learners"
on public.learners;
drop policy if exists "Parents can update own learners"
on public.learners;
drop policy if exists "Parents can delete own learners"
on public.learners;

drop policy if exists "Parents can select learner enrolments"
on public.enrolments;
drop policy if exists "Scholars can select class enrolments"
on public.enrolments;
drop policy if exists "Parents can insert learner enrolments"
on public.enrolments;

create or replace function public.parent_owns_learner(target_learner_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.learners
    where id = target_learner_id
      and parent_id = auth.uid()
  );
$$;

create or replace function public.scholar_can_view_learner(target_learner_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.enrolments e
    join public.classes c on c.id = e.class_id
    where e.learner_profile_id = target_learner_id
      and c.scholar_id = auth.uid()
  );
$$;

create policy "Parents can select own learners"
on public.learners
  for select
  using (
    parent_id = auth.uid()
    or public.scholar_can_view_learner(id)
  );

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

create policy "Parents can select learner enrolments"
on public.enrolments
  for select
  using (
    learner_id = auth.uid()
    or public.parent_owns_learner(learner_profile_id)
  );

create policy "Scholars can select class enrolments"
on public.enrolments
  for select
  using (
    exists (
      select 1
      from public.classes
      where classes.id = enrolments.class_id
        and classes.scholar_id = auth.uid()
    )
  );

create policy "Parents can insert learner enrolments"
on public.enrolments
  for insert
  with check (
    learner_id = auth.uid()
    and public.parent_owns_learner(learner_profile_id)
  );

grant execute on function public.parent_owns_learner(uuid) to authenticated;
grant execute on function public.scholar_can_view_learner(uuid) to authenticated;
