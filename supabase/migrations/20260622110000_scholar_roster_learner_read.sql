create policy "Scholars can select learners enrolled in own classes"
on public.learners
  for select
  using (
    exists (
      select 1
      from public.enrolments
      join public.classes on classes.id = enrolments.class_id
      where enrolments.learner_profile_id = learners.id
        and classes.scholar_id = auth.uid()
    )
  );
