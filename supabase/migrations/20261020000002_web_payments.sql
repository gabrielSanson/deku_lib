-- Web ordering: how an order is meant to be paid, and the toggle that allows
-- paying at pickup/delivery instead of online.

alter table public.orders
  add column payment_plan text not null default 'counter'
    check (payment_plan in ('counter', 'online', 'on_fulfillment', 'channel'));

alter table public.store_runtime_settings
  add column pay_on_fulfillment_enabled boolean not null default true;

-- Online checkouts that were never paid are cancelled by the worker after expiry.
alter table public.tenders add column expires_at timestamptz;
create index tenders_pending_idx on public.tenders (status, expires_at) where status = 'pending';
