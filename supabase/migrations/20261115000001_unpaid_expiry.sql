-- Unpaid Pix-key orders and totem "pagar no caixa" orders cancel themselves after a while,
-- so they stop counting against the busy limit. Staff POS orders are never cancelled this way.
alter table public.store_runtime_settings
  add column unpaid_pix_minutes integer not null default 20 check (unpaid_pix_minutes between 5 and 120),
  add column unpaid_counter_minutes integer not null default 15 check (unpaid_counter_minutes between 5 and 120);

create index orders_unpaid_new_idx on public.orders (created_at)
  where status = 'new' and payment_status <> 'paid';
