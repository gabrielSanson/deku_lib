-- S2.2: a shop can link its iFood store to the platform's single iFood app (no developer account
-- of its own), test its integration in homologation mode, and cancel iFood orders the iFood way.
alter table public.ifood_settings
  add column auth_mode text not null default 'own' check (auth_mode in ('own', 'app')),
  add column link_user_code text,
  add column link_verifier text,
  add column link_expires_at timestamptz,
  add column linked_at timestamptz,
  add column homologation boolean not null default false;

-- Full payloads, kept only while a shop is in homologation (order details carry customer data).
alter table public.channel_events add column detail jsonb;
alter table public.channel_outbound add column response text;

-- A cancellation we asked a delivery app for; the order is cancelled when the app confirms it.
alter table public.orders
  add column cancel_requested_at timestamptz,
  add column cancel_request_reason text;
