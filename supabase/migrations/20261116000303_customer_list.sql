-- S3.3: the customer list. Where each contact came from (only the shop's own channels may be
-- marketed to), running totals kept by order creation and cancellation, birthday and opt-out.
alter table public.customers
  add column source text not null default 'own'
    check (source in ('own', 'ifood', 'opendelivery', 'whatsapp', 'pos')),
  add column first_order_at timestamptz,
  add column last_order_at timestamptz,
  add column orders_count integer not null default 0,
  add column total_spent_cents bigint not null default 0,
  add column birthday date,
  add column marketing_opt_out_at timestamptz,
  -- Token for the one-tap marketing opt-out link.
  add column opt_out_token text not null default encode(gen_random_bytes(12), 'hex');
create unique index customers_opt_out_token on public.customers (opt_out_token);

-- Contacts created by delivery-app orders so far.
update public.customers c set source = case o.channel when 'ifood' then 'ifood' else 'opendelivery' end
from (select distinct on (customer_id) customer_id, channel from public.orders
      where customer_id is not null order by customer_id, created_at) o
where o.customer_id = c.id and o.channel in ('ifood', 'opendelivery');

update public.customers c set
  orders_count = s.n, total_spent_cents = s.total, first_order_at = s.first_at, last_order_at = s.last_at
from (select customer_id, count(*)::int as n, coalesce(sum(total_cents), 0) as total,
        min(created_at) as first_at, max(created_at) as last_at
      from public.orders
      where customer_id is not null and is_test = false and status not in ('cancelled', 'rejected')
      group by customer_id) s
where s.customer_id = c.id;

create index customers_last_order_idx on public.customers (shop_id, last_order_at desc);
