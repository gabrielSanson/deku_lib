-- S1.5: the platform charges each shop a monthly fee. v1: a static Pix code to the platform's
-- key, confirmed by hand in the platform console. Shops can read their own invoices.

create table public.plans (
  code text primary key,
  name text not null,
  price_cents integer not null check (price_cents >= 0),
  limits jsonb not null default '{}'::jsonb
);
-- Price is a placeholder until the owner sets it (platform console or SQL).
insert into public.plans (code, name, price_cents) values ('essencial', 'Essencial', 9990);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  plan text not null references public.plans (code),
  period_start date not null,
  period_end date not null,
  amount_cents integer not null check (amount_cents >= 0),
  status text not null default 'open' check (status in ('open', 'paid', 'void')),
  due_at timestamptz not null,
  paid_at timestamptz,
  pix_payload text,
  method text not null default 'pix',
  provider text not null default 'manual_pix',
  provider_ref text,
  marked_paid_by uuid,
  created_at timestamptz not null default now(),
  unique (shop_id, period_start)
);
create index invoices_status_idx on public.invoices (status, due_at);

create table public.platform_settings (
  id smallint primary key default 1 check (id = 1),
  pix_key text,
  pix_merchant_name text,
  pix_merchant_city text,
  grace_days integer not null default 7 check (grace_days between 0 and 60),
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (id) values (1);

alter table public.plans enable row level security;
alter table public.invoices enable row level security;
alter table public.platform_settings enable row level security;
create policy plans_read on public.plans for select to app_server using (true);
create policy invoices_own_read on public.invoices for select to app_server
  using (shop_id = public.current_shop_id());
