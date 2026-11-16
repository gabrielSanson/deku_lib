-- S2.3: a different price per channel (iFood charges commission, so shops price higher there),
-- a shop-wide markup with rounding, and the results of each menu sync to a delivery app.
create table public.channel_settings (
  shop_id uuid primary key default public.current_shop_id() references public.shops (id),
  ifood_markup_bps integer not null default 0 check (ifood_markup_bps between 0 and 10000),
  -- Prices end in these cents after the markup (90 → R$ 34,90); null leaves them unrounded.
  round_to_cents integer default 90 check (round_to_cents between 0 and 99),
  updated_at timestamptz not null default now()
);

create table public.menu_channel_prices (
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  sku text not null,
  channel text not null check (channel in ('ifood', 'opendelivery')),
  price_cents integer not null check (price_cents between 0 and 10000000),
  primary key (shop_id, sku, channel),
  foreign key (shop_id, sku) references public.menu_products (shop_id, sku) on delete cascade
);

create table public.menu_channel_option_prices (
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  sku text not null,
  channel text not null check (channel in ('ifood', 'opendelivery')),
  price_cents integer not null check (price_cents between 0 and 10000000),
  primary key (shop_id, sku, channel),
  foreign key (shop_id, sku) references public.menu_modifier_options (shop_id, sku) on delete cascade
);

create table public.channel_sync_reports (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  channel text not null,
  kind text not null check (kind in ('menu', 'availability')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created integer not null default 0,
  updated integer not null default 0,
  failed jsonb not null default '[]',
  error text
);
create index channel_sync_reports_recent on public.channel_sync_reports (shop_id, channel, started_at desc);

alter table public.channel_settings enable row level security;
alter table public.menu_channel_prices enable row level security;
alter table public.menu_channel_option_prices enable row level security;
alter table public.channel_sync_reports enable row level security;
create policy channel_settings_shop on public.channel_settings for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy menu_channel_prices_shop on public.menu_channel_prices for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy menu_channel_option_prices_shop on public.menu_channel_option_prices for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy channel_sync_reports_shop on public.channel_sync_reports for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
