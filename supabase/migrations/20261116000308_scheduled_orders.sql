-- S3.8: orders for later. The customer picks a 15-minute slot at checkout and pays when placing;
-- the kitchen sees the order only from scheduled_for minus the prep time.
alter table public.orders add column scheduled_for timestamptz;
create index orders_scheduled_idx on public.orders (shop_id, scheduled_for)
  where scheduled_for is not null;

alter table public.store_runtime_settings
  add column scheduling_enabled boolean not null default false,
  add column max_orders_per_slot integer check (max_orders_per_slot is null or max_orders_per_slot > 0);
