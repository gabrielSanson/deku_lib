-- Every order is paid when it is placed (owner rule, 21 Oct 2026). The switch
-- that let site customers pay on pickup or delivery goes away. Orders placed
-- before keep payment_plan = 'on_fulfillment', so the check constraint stays.
alter table public.store_runtime_settings drop column pay_on_fulfillment_enabled;
