-- S3.1: WhatsApp Business (Cloud API) ordering bot and order status messages, and one outbox for
-- every message the shop sends (WhatsApp or e-mail). Access token and app secret are in
-- shop_secrets ('whatsapp', 'whatsapp_app_secret').
create table public.whatsapp_settings (
  shop_id uuid primary key default public.current_shop_id() references public.shops (id),
  enabled boolean not null default false,
  phone_number_id text,
  waba_id text,
  display_phone text,
  verify_token text not null default encode(gen_random_bytes(16), 'hex'),
  -- Template name → approval status as Meta last reported it.
  templates jsonb not null default '{}',
  last_test_at timestamptz,
  last_test_error text,
  updated_at timestamptz not null default now()
);

-- One row per customer number that wrote to the shop.
create table public.whatsapp_conversations (
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  phone_e164 text not null,
  last_inbound_at timestamptz not null default now(),
  -- The customer asked for a person; cleared when staff mark it handled.
  needs_staff_at timestamptz,
  primary key (shop_id, phone_e164)
);

-- The menu link sent by the bot: ties the WhatsApp number to one checkout.
create table public.whatsapp_links (
  token text primary key,
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  phone_e164 text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 day',
  order_id uuid references public.orders (id) on delete set null
);

create table public.message_outbox (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  channel text not null check (channel in ('whatsapp', 'email')),
  to_address text not null,
  -- A template name, or '_text' for a free reply inside the 24-hour window.
  template text not null,
  vars jsonb not null default '{}',
  order_id uuid references public.orders (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0,
  provider_ref text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index message_outbox_status_idx on public.message_outbox (shop_id, status, created_at);
-- One status message of a kind per order, whatever the retries.
create unique index message_outbox_order_template on public.message_outbox (order_id, channel, template)
  where order_id is not null and template <> '_text';

alter table public.customers add column whatsapp_updates_at timestamptz;

alter table public.whatsapp_settings enable row level security;
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_links enable row level security;
alter table public.message_outbox enable row level security;
create policy whatsapp_settings_shop on public.whatsapp_settings for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy whatsapp_conversations_shop on public.whatsapp_conversations for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy whatsapp_links_shop on public.whatsapp_links for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy message_outbox_shop on public.message_outbox for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
