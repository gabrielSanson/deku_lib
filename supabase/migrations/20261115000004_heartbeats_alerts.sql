-- The worker and the watchdog check in every minute; the watchdog opens an alert when
-- something stops (worker, iFood poll, backups, orders) and tells the owner by e-mail and push.
create table public.system_heartbeats (
  name text primary key,              -- 'worker', 'watchdog', 'ifood-poll'
  beat_at timestamptz not null default now(),
  detail jsonb not null default '{}'::jsonb
);

create table public.alert_settings (
  id smallint primary key default 1 check (id = 1),
  email_to text[] not null default '{}',
  push_enabled boolean not null default true,
  no_orders_enabled boolean not null default true,
  no_orders_minutes integer not null default 60 check (no_orders_minutes between 15 and 240),
  updated_at timestamptz not null default now()
);
insert into public.alert_settings (id) values (1);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('worker_down','no_orders','ifood_poll','backup_stale','fiscal_errors','disk')),
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  last_notified_at timestamptz,
  detail jsonb not null default '{}'::jsonb
);
create unique index alerts_one_open_idx on public.alerts (kind) where resolved_at is null;

create table public.staff_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff_users (id) on delete cascade,
  endpoint text not null check (endpoint like 'https://%'),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (staff_id, endpoint)
);

alter table public.system_heartbeats enable row level security;
alter table public.alert_settings enable row level security;
alter table public.alerts enable row level security;
alter table public.staff_push_subscriptions enable row level security;
