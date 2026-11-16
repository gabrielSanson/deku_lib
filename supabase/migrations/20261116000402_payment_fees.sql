-- S4.2: what each way of being paid costs. A shop's rows override the defaults in
-- src/lib/domain/payment-fees.ts; the fee is stored on the tender when it is paid.
create table public.payment_method_terms (
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  method text not null,
  provider text not null,
  fee_bps integer not null default 0 check (fee_bps between 0 and 5000),
  fee_fixed_cents integer not null default 0 check (fee_fixed_cents >= 0),
  settle_days integer not null default 0 check (settle_days between 0 and 365),
  primary key (shop_id, method, provider)
);
alter table public.payment_method_terms enable row level security;
create policy payment_method_terms_shop on public.payment_method_terms for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());

alter table public.tenders
  add column fee_cents integer not null default 0 check (fee_cents >= 0),
  -- Null until the fee is set: 'provider' when the provider reported it, else 'terms'.
  add column fee_source text check (fee_source in ('provider', 'terms'));
