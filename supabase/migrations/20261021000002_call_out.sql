-- "Chamar": staff call a ready order out loud and tap the button, which is
-- recorded here (the board pulses the card; the ready alert is sent again).
alter table public.orders
  add column called_at timestamptz,
  add column call_count integer not null default 0;
