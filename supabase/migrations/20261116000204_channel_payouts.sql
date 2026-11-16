-- S2.4: the owner uploads iFood's financial statement (Portal do Parceiro → Financeiro) and the
-- system checks each line against our orders: what iFood kept, what it paid, what is missing.
create table public.channel_payout_uploads (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  channel text not null check (channel in ('ifood', 'opendelivery')),
  filename text,
  period_start date,
  period_end date,
  rows integer not null default 0,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);

create table public.channel_payouts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  upload_id uuid not null references public.channel_payout_uploads (id) on delete cascade,
  channel text not null,
  period text,
  order_id uuid references public.orders (id),
  channel_order_ref text,
  occurred_on date,
  gross_cents integer not null default 0,
  commission_cents integer not null default 0,
  fee_cents integer not null default 0,
  net_cents integer not null default 0,
  raw jsonb not null
);
create index channel_payouts_upload on public.channel_payouts (upload_id);
create index channel_payouts_order on public.channel_payouts (shop_id, order_id);

-- Header names of the statement columns, when the shop's export differs from the defaults.
alter table public.channel_settings add column ifood_payout_columns jsonb;

alter table public.channel_payout_uploads enable row level security;
alter table public.channel_payouts enable row level security;
create policy channel_payout_uploads_shop on public.channel_payout_uploads for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy channel_payouts_shop on public.channel_payouts for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
