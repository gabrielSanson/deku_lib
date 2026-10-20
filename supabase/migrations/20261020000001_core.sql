-- Core operational schema for the burger shop.
-- Money is integer centavos, timestamps are timestamptz (UTC), ids are UUIDs.
-- All writes go through the SvelteKit server using a privileged connection.
-- RLS is enabled everywhere; the only browser access is read-only staff access
-- to order tables so Supabase Realtime can deliver change hints.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Staff and audit
-- ---------------------------------------------------------------------------

create table public.staff_users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('owner', 'manager', 'cashier', 'kitchen')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_type text not null check (actor_type in ('staff', 'system', 'customer', 'integration')),
  action text not null,
  object_type text not null,
  object_id text,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_object_idx on public.audit_log (object_type, object_id, created_at);
create index audit_log_created_idx on public.audit_log (created_at);

-- ---------------------------------------------------------------------------
-- Live store operations (owned by the app, never by the CMS)
-- ---------------------------------------------------------------------------

create table public.store_runtime_settings (
  id smallint primary key default 1 check (id = 1),
  accepting_orders boolean not null default false,
  pause_reason text,
  pickup_enabled boolean not null default true,
  delivery_enabled boolean not null default false,
  web_ordering_enabled boolean not null default false,
  prep_time_minutes integer not null default 20 check (prep_time_minutes between 1 and 240),
  max_open_orders integer check (max_open_orders is null or max_open_orders > 0),
  updated_by uuid references public.staff_users (id),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);
insert into public.store_runtime_settings (id) values (1);

create table public.delivery_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  match_kind text not null check (match_kind in ('cep_prefix', 'neighborhood')),
  match_value text not null,
  fee_cents integer not null check (fee_cents >= 0),
  min_order_cents integer not null default 0 check (min_order_cents >= 0),
  enabled boolean not null default true,
  priority integer not null default 100,
  updated_by uuid references public.staff_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_kind, match_value)
);

create table public.product_availability_overrides (
  sku text not null,
  channel text not null check (channel in ('all', 'counter', 'web', 'ifood')),
  sold_out boolean not null default true,
  reason text,
  updated_by uuid references public.staff_users (id),
  updated_at timestamptz not null default now(),
  primary key (sku, channel)
);

-- ---------------------------------------------------------------------------
-- Customers and orders
-- ---------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone_e164 text,
  email text,
  marketing_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create unique index customers_phone_idx on public.customers (phone_e164) where phone_e164 is not null and deleted_at is null;

create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number integer not null unique default nextval('public.order_number_seq'),
  public_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  channel text not null check (channel in ('counter', 'web', 'ifood')),
  source_mode text not null check (source_mode in ('staff_pos', 'web', 'kiosk', 'ifood_api', 'ifood_manual')),
  channel_order_id text,
  customer_id uuid references public.customers (id),
  customer_label text,
  status text not null default 'new'
    check (status in ('new', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'rejected')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'cancelled', 'refunded', 'unknown')),
  fulfillment_type text not null check (fulfillment_type in ('counter', 'pickup', 'delivery')),
  fulfillment_provider text not null default 'shop'
    check (fulfillment_provider in ('shop', 'own_driver', 'ifood_courier')),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  delivery_rule_snapshot jsonb,
  notes text,
  catalog_version text,
  idempotency_key text unique,
  is_test boolean not null default false,
  kitchen_seen_at timestamptz,
  promised_at timestamptz,
  accepted_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_by uuid references public.staff_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  check (total_cents = subtotal_cents - discount_cents + delivery_fee_cents),
  unique (channel, channel_order_id)
);
create index orders_status_created_idx on public.orders (status, created_at);
create index orders_channel_created_idx on public.orders (channel, created_at);
create index orders_customer_created_idx on public.orders (customer_id, created_at);
create index orders_created_idx on public.orders (created_at);
create index orders_promised_idx on public.orders (promised_at);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  position integer not null,
  product_sku text not null,
  product_name text not null,
  category_name text,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  modifiers_unit_cents integer not null default 0 check (modifiers_unit_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  note text,
  allergy_flag boolean not null default false,
  prep_station text not null default 'grill',
  check (line_total_cents = quantity * (unit_price_cents + modifiers_unit_cents))
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_sku_idx on public.order_items (product_sku);

create table public.order_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  group_name text not null,
  option_sku text,
  option_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_cents integer not null default 0 check (unit_price_cents >= 0)
);
create index order_item_modifiers_item_idx on public.order_item_modifiers (order_item_id);

create table public.order_addresses (
  order_id uuid primary key references public.orders (id) on delete cascade,
  recipient text not null,
  cep text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state text not null,
  instructions text
);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_type text not null check (actor_type in ('staff', 'system', 'customer', 'integration')),
  actor_id uuid,
  reason text,
  source_event_id text,
  occurred_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, occurred_at);
create index order_status_history_to_idx on public.order_status_history (to_status, occurred_at);

-- ---------------------------------------------------------------------------
-- Payments / tenders
-- ---------------------------------------------------------------------------

create table public.tenders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  method text not null check (method in (
    'cash', 'pix', 'online_card', 'softpos_nfc', 'terminal_card', 'external_pix', 'ifood_collected'
  )),
  provider text not null default 'manual',
  provider_reference text,
  amount_cents integer not null check (amount_cents > 0),
  cash_received_cents integer check (cash_received_cents is null or cash_received_cents >= 0),
  change_cents integer check (change_cents is null or change_cents >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'cancelled', 'refunded', 'unknown')),
  idempotency_key text not null unique,
  provider_payload jsonb,
  recorded_by uuid references public.staff_users (id),
  confirmed_at timestamptz,
  refunded_at timestamptz,
  refund_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tenders_order_idx on public.tenders (order_id);
create index tenders_created_idx on public.tenders (created_at);
create unique index tenders_provider_ref_idx on public.tenders (provider, provider_reference)
  where provider_reference is not null and provider <> 'manual';

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text,
  signature_valid boolean not null,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processed', 'ignored', 'failed')),
  attempts integer not null default 0,
  payload jsonb,
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id)
);

create table public.channel_events (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  provider_event_id text not null,
  event_type text,
  channel_order_id text,
  delivery_method text not null check (delivery_method in ('webhook', 'polling', 'manual')),
  signature_valid boolean,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processed', 'ignored', 'failed', 'dead')),
  attempts integer not null default 0,
  acknowledged_at timestamptz,
  payload jsonb not null,
  error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (channel, provider_event_id)
);
create index channel_events_status_idx on public.channel_events (processing_status, received_at);

create table public.integration_mappings (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  entity_type text not null check (entity_type in ('product', 'option')),
  internal_sku text not null,
  external_id text not null,
  external_code text,
  last_synced_at timestamptz,
  unique (channel, entity_type, internal_sku),
  unique (channel, entity_type, external_id)
);

-- ---------------------------------------------------------------------------
-- Keep updated_at fresh
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger staff_users_touch before update on public.staff_users
  for each row execute function public.touch_updated_at();
create trigger delivery_rules_touch before update on public.delivery_rules
  for each row execute function public.touch_updated_at();
create trigger customers_touch before update on public.customers
  for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();
create trigger tenders_touch before update on public.tenders
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

create or replace function public.is_active_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_users where id = auth.uid() and active)
$$;
revoke all on function public.is_active_staff() from public;
grant execute on function public.is_active_staff() to authenticated;

alter table public.staff_users enable row level security;
alter table public.audit_log enable row level security;
alter table public.store_runtime_settings enable row level security;
alter table public.delivery_rules enable row level security;
alter table public.product_availability_overrides enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_item_modifiers enable row level security;
alter table public.order_addresses enable row level security;
alter table public.order_status_history enable row level security;
alter table public.tenders enable row level security;
alter table public.payment_events enable row level security;
alter table public.channel_events enable row level security;
alter table public.integration_mappings enable row level security;

-- Realtime only needs to see that an order row changed; the browser then
-- re-fetches the authoritative view from the server. No write policies exist.
grant select on public.orders, public.store_runtime_settings to authenticated;
create policy orders_staff_read on public.orders for select to authenticated
  using (public.is_active_staff());
create policy store_settings_staff_read on public.store_runtime_settings for select to authenticated
  using (public.is_active_staff());

alter publication supabase_realtime add table public.orders, public.store_runtime_settings;
