-- S5.11: errors from the web app, the worker and browsers, grouped by fingerprint so the platform
-- console lists each problem once with a count. shop_id is null for errors outside any shop.
create table public.error_events (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references public.shops (id) on delete cascade,
  fingerprint text not null,
  "where" text not null check ("where" in ('web', 'worker', 'client')),
  route text,
  message text not null,
  stack text,
  request_id text,
  user_kind text check (user_kind in ('staff', 'customer', 'platform', 'anonymous')),
  count integer not null default 1,
  first_at timestamptz not null default now(),
  at timestamptz not null default now()
);
create unique index error_events_fingerprint_idx
  on public.error_events (coalesce(shop_id, '00000000-0000-0000-0000-000000000000'::uuid), fingerprint);
create index error_events_at_idx on public.error_events (at desc);

alter table public.error_events enable row level security;
-- Written and read through the platform connection; a shop's own role sees only its rows.
create policy error_events_shop on public.error_events for select to app_server
  using (shop_id = current_shop_id());
grant select on public.error_events to app_server;
