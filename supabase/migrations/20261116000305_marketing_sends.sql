-- S3.5: marketing messages to customers who accept offers, each send recorded with its audience.
create table public.marketing_sends (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  channel text not null check (channel in ('whatsapp', 'email')),
  template text,
  subject text,
  body text,
  audience jsonb not null default '{}',
  recipients integer not null default 0,
  estimated_cost_cents integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table public.marketing_sends enable row level security;
create policy marketing_sends_shop on public.marketing_sends for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());

alter table public.message_outbox add column send_id uuid references public.marketing_sends (id);
-- What one WhatsApp marketing message costs the shop, to show an estimate before sending.
alter table public.whatsapp_settings add column marketing_price_cents integer not null default 35
  check (marketing_price_cents between 0 and 1000);
