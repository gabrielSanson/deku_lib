-- S2.5: Open Delivery (Abrasel's open standard) for partner apps such as 99Food and Keeta.
-- One row per shop and partner; the client secret is in shop_secrets ('opendelivery_<partner>').
create table public.opendelivery_settings (
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  partner text not null check (partner in ('99food', 'keeta')),
  enabled boolean not null default false,
  base_url text,
  client_id text,
  merchant_id text,
  last_check_at timestamptz,
  last_check_ok boolean,
  last_check_error text,
  last_poll_ok_at timestamptz,
  last_poll_error_at timestamptz,
  last_poll_error text,
  updated_at timestamptz not null default now(),
  primary key (shop_id, partner)
);
alter table public.opendelivery_settings enable row level security;
create policy opendelivery_settings_shop on public.opendelivery_settings for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
