-- Allow email/password signup to choose the existing parent or scholar role.
-- Supabase Auth redirect URLs must include:
-- http://localhost:3000/auth/callback
-- http://localhost:3000/auth/update-password
-- production-domain/auth/callback
-- production-domain/auth/update-password

create or replace function public.handle_new_user()
returns trigger as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data ->> 'role', 'parent');
begin
  if requested_role not in ('parent', 'scholar') then
    requested_role := 'parent';
  end if;

  insert into public.profiles (id, role_id)
  values (
    new.id,
    (select id from public.roles where code = requested_role)
  );

  return new;
end;
$$ language plpgsql security definer;
