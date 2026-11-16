-- S1.3: which version of the platform's terms, privacy notice and DPA each shop owner accepted.
create table public.terms_acceptances (
  id bigint generated always as identity primary key,
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  document text not null check (document in ('terms', 'dpa', 'privacy')),
  version text not null,
  accepted_at timestamptz not null default now(),
  ip text
);
create index terms_acceptances_shop_idx on public.terms_acceptances (shop_id, accepted_at);
alter table public.terms_acceptances enable row level security;
create policy terms_acceptances_shop on public.terms_acceptances for select to app_server
  using (shop_id = public.current_shop_id());

-- The platform console acts as its own kind of actor in the audit log.
alter table public.audit_log drop constraint if exists audit_log_actor_type_check;
alter table public.audit_log add constraint audit_log_actor_type_check
  check (actor_type in ('staff', 'customer', 'system', 'integration', 'platform'));

-- Platform-level entries (the platform's own settings) belong to no shop; shops never see them.
alter table public.audit_log alter column shop_id drop not null;
