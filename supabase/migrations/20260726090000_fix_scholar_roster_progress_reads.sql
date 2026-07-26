-- Scholars may read only learners enrolled in classes they teach.
-- SECURITY DEFINER avoids learners <-> enrolments RLS recursion while the
-- function itself enforces the class ownership boundary.
create or replace function public.scholar_can_view_learner(
  target_learner_id uuid
)
returns boolean
language sql
stable
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

revoke all on function public.scholar_can_view_learner(uuid) from public;
grant execute on function public.scholar_can_view_learner(uuid) to authenticated;

drop policy if exists "Scholars can select learners enrolled in own classes"
on public.learners;

create policy "Scholars can select learners enrolled in own classes"
on public.learners
for select
to authenticated
using (public.scholar_can_view_learner(id));

drop policy if exists "Scholars can select class enrolments"
on public.enrolments;

create policy "Scholars can select class enrolments"
on public.enrolments
for select
to authenticated
using (
  exists (
    select 1
    from public.classes c
    where c.id = enrolments.class_id
      and c.scholar_id = auth.uid()
  )
);
