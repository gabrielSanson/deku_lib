-- "Avisar quando ficar pronto": a web push subscription saved on one order,
-- used only for that order's ready alert and removed once the order is done.
-- Never used for marketing.

create table public.order_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  endpoint text not null check (endpoint like 'https://%'),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  last_sent_at timestamptz,
  last_error text,
  unique (order_id, endpoint)
);

-- The shop's VAPID key pair, made on first use. The private key is encrypted with APP_SECRET.
create table public.web_push_keys (
  id integer primary key default 1 check (id = 1),
  public_key text not null,
  private_key_enc text not null,
  created_at timestamptz not null default now()
);

alter table public.order_push_subscriptions enable row level security;
alter table public.web_push_keys enable row level security;
