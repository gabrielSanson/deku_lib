-- S3.6: "Meus dados": a customer asks for a copy of their data or for it to be deleted (LGPD).
create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  customer_id uuid references public.customers (id),
  email text,
  kind text not null check (kind in ('access', 'delete')),
  status text not null default 'unconfirmed'
    check (status in ('unconfirmed', 'pending', 'done', 'refused')),
  -- The public form confirms by a code sent to the e-mail (hash only).
  confirm_code_hash text,
  confirm_attempts integer not null default 0,
  requested_at timestamptz not null default now(),
  due_at timestamptz,
  answered_at timestamptz,
  answered_by uuid,
  note text
);
create index privacy_requests_open on public.privacy_requests (shop_id, status, due_at);
alter table public.privacy_requests enable row level security;
create policy privacy_requests_shop on public.privacy_requests for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());

-- Days the shop has to answer. TODO(verify) the exact deadline for small businesses (ANPD Res. 2/2022).
alter table public.store_runtime_settings add column privacy_due_days integer not null default 30
  check (privacy_due_days between 1 and 90);
