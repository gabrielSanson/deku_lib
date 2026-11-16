-- S1.1: many shops on one system. Every business row will belong to a shop (next migration).
-- A self-hosted single shop keeps working: its rows go to the default shop below, whose id is fixed.

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  name text not null check (length(name) between 1 and 80),
  business_type text not null default 'lanchonete',
  preset text not null default 'blank',
  timezone text not null default 'America/Sao_Paulo',
  status text not null default 'trial' check (status in ('trial', 'active', 'past_due', 'suspended', 'closed')),
  plan text not null default 'essencial',
  trial_ends_at timestamptz,
  city text,
  created_at timestamptz not null default now()
);

create table public.shop_domains (
  host text primary key check (host = lower(host)),
  shop_id uuid not null references public.shops (id) on delete cascade,
  kind text not null check (kind in ('platform', 'custom')),
  verified_at timestamptz
);
create index shop_domains_shop_idx on public.shop_domains (shop_id);

create table public.shop_members (
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'attendant', 'kitchen')),
  display_name text not null,
  active boolean not null default true,
  pin_hash text,
  created_at timestamptz not null default now(),
  primary key (shop_id, user_id)
);
create index shop_members_user_idx on public.shop_members (user_id);

create table public.shop_counters (
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null,
  value bigint not null,
  primary key (shop_id, name)
);

create table public.shop_secrets (
  shop_id uuid not null references public.shops (id) on delete cascade,
  kind text not null,
  ciphertext text not null,
  updated_at timestamptz not null default now(),
  primary key (shop_id, kind)
);

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- How this install runs. 'single' (default): everything belongs to the default shop. 'multi': the app
-- sets the shop for each request, and a row written without one is refused. The app writes this at start.
create table public.platform_config (
  id smallint primary key default 1 check (id = 1),
  tenancy text not null default 'single' check (tenancy in ('single', 'multi'))
);
insert into public.platform_config (id) values (1);

-- Default shop for existing installs; its id is stable so self-hosted single shops keep working.
insert into public.shops (id, slug, name, status)
values (
  '00000000-0000-4000-8000-000000000001',
  'loja',
  coalesce(nullif(left((select display_name from public.store_profile where id = 1), 80), ''), 'Minha loja'),
  'active'
);

-- The shop of the current request: set by the app (app.shop_id) inside a shop's connection or
-- transaction. On a single-shop install it falls back to the default shop.
create or replace function public.current_shop_id() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('app.shop_id', true), '')::uuid,
    (select '00000000-0000-4000-8000-000000000001'::uuid from public.platform_config where tenancy = 'single')
  )
$$;

alter table public.shops enable row level security;
alter table public.shop_domains enable row level security;
alter table public.shop_members enable row level security;
alter table public.shop_counters enable row level security;
alter table public.shop_secrets enable row level security;
alter table public.platform_admins enable row level security;
alter table public.platform_config enable row level security;
