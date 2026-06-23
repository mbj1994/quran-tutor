alter table public.enrolments
  add column if not exists learner_profile_id uuid;

alter table public.enrolments
  drop constraint if exists enrolments_learner_profile_id_fkey;

alter table public.enrolments
  add constraint enrolments_learner_profile_id_fkey
  foreign key (learner_profile_id)
  references public.learners(id)
  on delete cascade;

alter table public.enrolments
  drop constraint if exists enrolments_class_id_learner_id_key;

create unique index if not exists enrolments_class_learner_profile_unique
on public.enrolments (class_id, learner_profile_id)
where learner_profile_id is not null;

drop policy if exists "Enrolment read/write" on public.enrolments;
drop policy if exists "Parents can select learner enrolments" on public.enrolments;
drop policy if exists "Scholars can select class enrolments" on public.enrolments;
drop policy if exists "Parents can insert learner enrolments" on public.enrolments;

create policy "Parents can select learner enrolments"
on public.enrolments
  for select
  using (
    learner_id = auth.uid()
    or exists (
      select 1
      from public.learners
      where learners.id = enrolments.learner_profile_id
        and learners.parent_id = auth.uid()
    )
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
    and exists (
      select 1
      from public.learners
      where learners.id = enrolments.learner_profile_id
        and learners.parent_id = auth.uid()
    )
  );
