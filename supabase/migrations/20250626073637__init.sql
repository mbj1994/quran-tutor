-- === Ensure UUID helper ===
create extension if not exists "pgcrypto";

-- ---------- TABLE: roles ----------
create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,          -- 'parent' | 'learner' | 'scholar'
  description text
);

insert into public.roles (code, description) values
  ('parent',  'Account owner / payer'),
  ('learner', 'Child student'),
  ('scholar', 'Instructor');

-- ---------- TABLE: profiles ----------
create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  full_name     text,
  role_id       uuid references public.roles,
  picture_url   text,
  created_at    timestamptz default now()
);

-- ---------- RLS for profiles ----------
alter table public.profiles enable row level security;

create policy "Own profile"
  on public.profiles
  for all
  using  ( auth.uid() = id )
  with check ( auth.uid() = id );

-- ---------- Trigger: create profile on signup ----------
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role_id)
  values ( new.id
         , (select id from public.roles where code = 'parent')
        );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
