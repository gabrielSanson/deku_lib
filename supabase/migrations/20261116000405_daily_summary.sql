-- S4.5: the owner's daily summary, 30 minutes after closing. One row per shop and day so a
-- retried job never sends it twice.
alter table public.alert_settings
  add column daily_summary_enabled boolean not null default true,
  -- The owner's WhatsApp for the summary template (needs WhatsApp set up).
  add column owner_whatsapp text;

create table public.daily_summaries (
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  day date not null,
  sent_at timestamptz not null default now(),
  detail jsonb not null default '{}',
  primary key (shop_id, day)
);
alter table public.daily_summaries enable row level security;
create policy daily_summaries_shop on public.daily_summaries for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
