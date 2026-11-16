-- S5.3: own couriers. Ready deliveries are grouped into a run for one courier, who taps "Saiu"
-- and "Entregue" on a private link; settling a run books the payout as an expense.
create table public.couriers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  name text not null check (length(name) between 1 and 60),
  phone text,
  pay_per_delivery_cents integer not null default 0 check (pay_per_delivery_cents between 0 and 100000),
  active boolean not null default true,
  access_token_hash text not null unique,
  created_at timestamptz not null default now()
);

create table public.delivery_runs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  courier_id uuid not null references public.couriers (id),
  created_at timestamptz not null default now(),
  left_at timestamptz,
  returned_at timestamptz,
  settled_at timestamptz,
  payout_cents integer check (payout_cents >= 0),
  expense_id uuid references public.expenses (id) on delete set null,
  created_by uuid
);
create index delivery_runs_open on public.delivery_runs (shop_id, settled_at, created_at);

create table public.deliveries (
  order_id uuid primary key references public.orders (id) on delete cascade,
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  run_id uuid not null references public.delivery_runs (id) on delete cascade,
  position integer not null default 0,
  assigned_at timestamptz not null default now(),
  delivered_at timestamptz
);
create index deliveries_run on public.deliveries (run_id);

do $$
declare t text;
begin
  foreach t in array array['couriers', 'delivery_runs', 'deliveries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to app_server using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id())',
      t || '_shop', t);
  end loop;
end $$;
