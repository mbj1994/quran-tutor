-- ---------- TABLE: subscriptions ----------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'active',
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------- TABLE: donations ----------
create table public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  stripe_checkout_session_id text unique not null,
  stripe_payment_intent_id text,
  amount_total integer,
  currency text,
  donor_email text,
  created_at timestamptz default now()
);

-- ---------- RLS ----------
alter table public.subscriptions enable row level security;
alter table public.donations enable row level security;

create policy "Own subscription"
on public.subscriptions
  for select
  using ( user_id = auth.uid() );

create policy "Own donations"
on public.donations
  for select
  using ( user_id = auth.uid() );
