alter table public.profiles
  add column if not exists scholar_status text default 'pending';

alter table public.profiles
  drop constraint if exists profiles_scholar_status_check;

alter table public.profiles
  add constraint profiles_scholar_status_check
  check (scholar_status in ('pending', 'approved', 'suspended'));

insert into public.roles (code, description)
values ('admin', 'Platform administrator')
on conflict (code) do nothing;
