-- iFood channel support: the short code iFood shows its couriers and customers,
-- and a log of every call we make back to iFood so failures are visible and retryable.

alter table public.orders add column channel_display_id text;

create table public.channel_outbound (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  order_id uuid not null references public.orders (id),
  action text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0,
  last_error text,
  request jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (order_id, action)
);
create index channel_outbound_status_idx on public.channel_outbound (status, created_at);
alter table public.channel_outbound enable row level security;
