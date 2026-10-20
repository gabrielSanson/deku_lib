-- Eating in: a customer at the shop orders from their phone and says where they
-- are sitting. Shops without seating leave it switched off.
alter table public.orders drop constraint orders_fulfillment_type_check;
alter table public.orders add constraint orders_fulfillment_type_check
  check (fulfillment_type in ('counter', 'pickup', 'delivery', 'dine_in'));
alter table public.orders add column table_label text check (table_label is null or length(table_label) <= 20);

alter table public.store_runtime_settings add column dine_in_enabled boolean not null default false;
