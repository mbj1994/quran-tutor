alter table public.lesson_progress
  add column if not exists covered text,
  add column if not exists revision text,
  add column if not exists parent_note text;

alter table public.lesson_progress
  drop constraint if exists lesson_progress_attendance_status_check;

alter table public.lesson_progress
  add constraint lesson_progress_attendance_status_check
  check (attendance_status in ('present', 'absent', 'late'));

drop policy if exists "Scholars can update learners enrolled in own classes"
on public.learners;

create policy "Scholars can update learners enrolled in own classes"
on public.learners
  for update
  using ( public.scholar_can_view_learner(id) )
  with check ( public.scholar_can_view_learner(id) );
