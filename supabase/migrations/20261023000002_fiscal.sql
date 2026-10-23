-- NFC-e (nota fiscal do consumidor) through a fiscal provider's API. Off until
-- the owner fills in the shop's fiscal data and turns it on; the provider holds
-- the A1 certificate and talks to SEFAZ.
create table public.fiscal_settings (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default false,
  provider text not null default 'focusnfe' check (provider in ('focusnfe')),
  environment text not null default 'homologacao' check (environment in ('homologacao', 'producao')),
  cnpj text check (cnpj is null or cnpj ~ '^\d{14}$'),
  api_token_enc text,
  -- Defaults for products without their own fiscal code; the accountant confirms them.
  default_ncm text check (default_ncm is null or default_ncm ~ '^\d{8}$'),
  default_cfop text not null default '5102' check (default_cfop ~ '^\d{4}$'),
  default_csosn text not null default '102' check (default_csosn ~ '^\d{3}$'),
  updated_by uuid references public.staff_users (id),
  updated_at timestamptz not null default now()
);
insert into public.fiscal_settings (id) values (1);

alter table public.menu_products
  add column ncm text check (ncm is null or ncm ~ '^\d{8}$');

create table public.fiscal_documents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  -- Our reference at the provider; a new attempt after a rejection gets a new one.
  ref text not null unique,
  environment text not null,
  status text not null default 'pending'
    check (status in ('pending', 'authorized', 'rejected', 'error', 'cancelled')),
  number text,
  series text,
  access_key text,
  danfe_url text,
  xml_url text,
  qr_url text,
  error_message text,
  attempts integer not null default 0,
  issued_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- One live note per order; rejected and cancelled ones stay as history.
create unique index fiscal_documents_live_idx on public.fiscal_documents (order_id)
  where status in ('pending', 'authorized', 'error');
create index fiscal_documents_created_idx on public.fiscal_documents (created_at);

alter table public.fiscal_settings enable row level security;
alter table public.fiscal_documents enable row level security;
