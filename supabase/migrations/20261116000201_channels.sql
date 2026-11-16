-- S2.1: room for more delivery channels. Open Delivery orders (99Food, Keeta) are channel
-- 'opendelivery' with the partner in channel_partner; channel_events and channel_outbound name the
-- adapter ('ifood', 'opendelivery_99food', 'opendelivery_keeta').
alter table public.orders drop constraint orders_channel_check,
  add constraint orders_channel_check check (channel in ('counter', 'web', 'ifood', 'opendelivery'));
alter table public.orders drop constraint orders_source_mode_check,
  add constraint orders_source_mode_check
    check (source_mode in ('staff_pos', 'web', 'kiosk', 'ifood_api', 'ifood_manual', 'opendelivery_api'));
alter table public.orders drop constraint orders_fulfillment_provider_check,
  add constraint orders_fulfillment_provider_check
    check (fulfillment_provider in ('shop', 'own_driver', 'ifood_courier', 'partner_courier'));
alter table public.orders add column channel_partner text
  check (channel_partner is null or channel_partner in ('99food', 'keeta'));
-- Two partner apps may use the same order id; orders without one (our own) stay unconstrained.
alter table public.orders drop constraint orders_channel_channel_order_id_key;
create unique index orders_channel_order_key
  on public.orders (shop_id, channel, coalesce(channel_partner, ''), channel_order_id);
