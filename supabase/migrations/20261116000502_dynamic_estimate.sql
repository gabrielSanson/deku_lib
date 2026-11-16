-- S5.2: the promised time grows with the kitchen queue; delivery adds the trip.
alter table public.store_runtime_settings
  add column per_order_minutes integer not null default 2 check (per_order_minutes between 0 and 30),
  add column delivery_minutes integer not null default 20 check (delivery_minutes between 0 and 180);
