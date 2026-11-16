-- S4.3: what the delivery apps keep and what an own delivery costs, for the profit report.
-- [UNVERIFIED] iFood commission defaults (12% shop delivers, 23% iFood delivers) from the
-- requirements doc; the payout statement's actual figures win when uploaded.
alter table public.channel_settings
  add column ifood_commission_bps integer not null default 1200 check (ifood_commission_bps between 0 and 5000),
  add column ifood_delivery_commission_bps integer not null default 2300
    check (ifood_delivery_commission_bps between 0 and 5000),
  add column od_commission_bps integer not null default 0 check (od_commission_bps between 0 and 5000);

alter table public.store_runtime_settings
  -- What the shop pays its own courier per delivery.
  add column delivery_cost_cents integer not null default 0 check (delivery_cost_cents >= 0),
  -- Simples Nacional rate on sales, for the monthly result (S4.4). 0 until the owner sets it.
  add column simples_rate_bps integer not null default 0 check (simples_rate_bps between 0 and 3000);
