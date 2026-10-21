-- Campaigns and coupons. A campaign is the rule (a template from code plus its
-- params, dates and time windows); a coupon is a code that unlocks a campaign.
-- Uses are not counted in a column: an order that names the campaign counts
-- unless it was cancelled, rejected, refunded or its payment failed.

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  name text not null check (length(name) between 1 and 80),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'ended')),
  starts_at timestamptz,
  ends_at timestamptz,
  -- [{ "days": [1,2,3], "start": "18:00", "end": "20:00" }] in shop time; empty = any time.
  time_windows jsonb not null default '[]',
  params jsonb not null default '{}',
  -- Applies without a code when the cart qualifies.
  auto_apply boolean not null default false,
  benefit_type text not null check (benefit_type in ('percent', 'fixed', 'free_delivery', 'free_items')),
  min_order_cents integer not null default 0 check (min_order_cents >= 0),
  max_uses_total integer check (max_uses_total is null or max_uses_total > 0),
  max_uses_per_customer integer check (max_uses_per_customer is null or max_uses_per_customer > 0),
  first_order_only boolean not null default false,
  created_by uuid references public.staff_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index campaigns_live_idx on public.campaigns (status) where status = 'active';

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id),
  -- Set for coupons issued to one customer (referral, birthday, loyalty).
  customer_id uuid references public.customers (id),
  code text not null check (code ~ '^[A-Z0-9_-]{3,24}$'),
  kind text not null default 'manual'
    check (kind in ('manual', 'referral_welcome', 'referral_reward', 'birthday', 'loyalty')),
  expires_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  active boolean not null default true,
  milestone_at integer,
  cycle_key text,
  friend_ref text,
  created_at timestamptz not null default now()
);
create unique index coupons_code_idx on public.coupons (code);
create index coupons_campaign_idx on public.coupons (campaign_id);

alter table public.orders
  add column campaign_id uuid references public.campaigns (id),
  add column coupon_id uuid references public.coupons (id);
create index orders_campaign_idx on public.orders (campaign_id) where campaign_id is not null;
create index orders_coupon_idx on public.orders (coupon_id) where coupon_id is not null;

-- The part of a line given away by the order's campaign (a free burger keeps
-- its menu price on the line; the same amount is in orders.discount_cents).
alter table public.order_items
  add column discount_cents integer not null default 0 check (discount_cents >= 0),
  add constraint order_items_discount_within_line check (discount_cents <= line_total_cents);

-- The one definition of "this order used its offer": every limit and report reads it.
create or replace function public.order_counts_for_offer(status text, payment_status text)
returns boolean language sql immutable as $$
  select status not in ('cancelled', 'rejected')
     and payment_status not in ('refunded', 'failed', 'cancelled')
$$;

create trigger campaigns_touch before update on public.campaigns
  for each row execute function public.touch_updated_at();

alter table public.campaigns enable row level security;
alter table public.coupons enable row level security;
