-- Tax reform (IBS and CBS) on NFC-e lines. Off until the owner (with the accountant) turns it
-- on; the rates are kept per calendar year so the 2027 change is a data edit, not a release.
alter table public.fiscal_settings
  add column crt text not null default '1' check (crt in ('1', '2', '3', '4')),  -- 1 Simples, 2 excesso, 3 normal, 4 MEI
  add column ibs_cbs_enabled boolean not null default false,
  add column ibs_cbs_cst text not null default '000' check (ibs_cbs_cst ~ '^\d{3}$'),
  add column ibs_cbs_class text not null default '000001' check (ibs_cbs_class ~ '^\d{6}$');

-- Rates by calendar year, editable by the owner/accountant; the defaults are the published test rates.
create table public.ibs_cbs_rates (
  year smallint primary key check (year between 2026 and 2040),
  cbs_rate numeric(7,4) not null check (cbs_rate >= 0),       -- percent, e.g. 0.9000
  ibs_uf_rate numeric(7,4) not null check (ibs_uf_rate >= 0),
  ibs_mun_rate numeric(7,4) not null check (ibs_mun_rate >= 0),
  note text,
  updated_at timestamptz not null default now()
);
insert into public.ibs_cbs_rates (year, cbs_rate, ibs_uf_rate, ibs_mun_rate, note, updated_at) values
  (2026, 0.9000, 0.1000, 0.0000, 'Taxas de teste publicadas para 2026', now()),
  -- Dated at the seed moment: from 1 Dec 2026 the fiscal page asks until the owner saves it.
  (2027, 0.9000, 0.0500, 0.0500, 'CBS de 2027 a confirmar com o contador', '2026-11-15 00:00:00+00');

alter table public.menu_products
  add column ibs_cbs_cst text check (ibs_cbs_cst is null or ibs_cbs_cst ~ '^\d{3}$'),
  add column ibs_cbs_class text check (ibs_cbs_class is null or ibs_cbs_class ~ '^\d{6}$');

-- What was sent, for the accountant.
alter table public.fiscal_documents add column ibs_cbs jsonb;

alter table public.ibs_cbs_rates enable row level security;
