-- Admin Control Center: authenticated admins may read the operational data
-- needed for platform oversight. Existing parent and scholar policies remain intact.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.id = auth.uid()
      and r.code = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins can select profiles" on public.profiles;
create policy "Admins can select profiles"
on public.profiles for select to authenticated
using (public.is_admin());

drop policy if exists "Admins can select classes" on public.classes;
create policy "Admins can select classes"
on public.classes for select to authenticated
using (public.is_admin());

drop policy if exists "Admins can select learners" on public.learners;
create policy "Admins can select learners"
on public.learners for select to authenticated
using (public.is_admin());

drop policy if exists "Admins can select enrolments" on public.enrolments;
create policy "Admins can select enrolments"
on public.enrolments for select to authenticated
using (public.is_admin());

drop policy if exists "Admins can select lesson progress" on public.lesson_progress;
create policy "Admins can select lesson progress"
on public.lesson_progress for select to authenticated
using (public.is_admin());
