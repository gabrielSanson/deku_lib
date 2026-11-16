-- S5.1: kitchen tickets through a server queue. A paired screen ("Esta tela imprime") claims
-- one job at a time; unacknowledged claims go back to the queue after 60 s, 3 tries at most.
create table public.print_stations (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  name text not null check (length(name) between 1 and 60),
  token_hash text not null unique,
  roles text[] not null default '{kitchen}' check (roles <@ '{kitchen,receipt}' and cardinality(roles) > 0),
  last_seen_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  station_id uuid references public.print_stations (id) on delete set null,
  kind text not null check (kind in ('kitchen', 'receipt', 'fiscal')),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'claimed', 'printed', 'failed')),
  attempts integer not null default 0,
  claimed_at timestamptz,
  printed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  reprint_of uuid references public.print_jobs (id) on delete set null
);
create index print_jobs_queue on public.print_jobs (shop_id, status, created_at);
create index print_jobs_order on public.print_jobs (order_id);
-- One automatic kitchen ticket per order; reprints are extra rows.
create unique index print_jobs_one_auto on public.print_jobs (order_id, kind) where reprint_of is null;

alter table public.print_stations enable row level security;
alter table public.print_jobs enable row level security;
create policy print_stations_shop on public.print_stations for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy print_jobs_shop on public.print_jobs for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
