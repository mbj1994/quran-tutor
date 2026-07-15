alter table public.profiles
  add column if not exists app_language text not null default 'English';

alter table public.profiles
  drop constraint if exists profiles_app_language_check;

alter table public.profiles
  add constraint profiles_app_language_check
  check (app_language in ('English', 'Mandinka', 'Wolof', 'Fula', 'Arabic'));
