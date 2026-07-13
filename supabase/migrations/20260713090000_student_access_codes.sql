alter table public.learners
  add column if not exists student_access_code text,
  add column if not exists student_access_code_created_at timestamptz default now();

create unique index if not exists learners_student_access_code_key
on public.learners (student_access_code);

create or replace function public.generate_student_access_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  generated_code text;
  index_value integer;
begin
  loop
    generated_code := '';

    for index_value in 1..8 loop
      generated_code := generated_code
        || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    end loop;

    exit when not exists (
      select 1
      from public.learners
      where student_access_code = generated_code
    );
  end loop;

  return generated_code;
end;
$$;

update public.learners
set
  student_access_code = public.generate_student_access_code(),
  student_access_code_created_at = coalesce(student_access_code_created_at, now())
where student_access_code is null
   or btrim(student_access_code) = '';

alter table public.learners
  alter column student_access_code set default public.generate_student_access_code(),
  alter column student_access_code_created_at set default now();

create or replace function public.ensure_learner_student_access_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.student_access_code is null or btrim(new.student_access_code) = '' then
    new.student_access_code := public.generate_student_access_code();
    new.student_access_code_created_at := coalesce(new.student_access_code_created_at, now());
  else
    new.student_access_code := upper(btrim(new.student_access_code));
    new.student_access_code_created_at := coalesce(new.student_access_code_created_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists set_learner_student_access_code on public.learners;

create trigger set_learner_student_access_code
before insert or update of student_access_code on public.learners
for each row execute function public.ensure_learner_student_access_code();
