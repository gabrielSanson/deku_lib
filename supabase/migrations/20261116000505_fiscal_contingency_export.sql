-- S5.5: NFC-e issued in offline contingency (tpEmis 9) waits as 'contingency' until SEFAZ
-- authorizes it; the month's XMLs are cached for the accountant's export.
alter table public.fiscal_documents drop constraint fiscal_documents_status_check,
  add constraint fiscal_documents_status_check
    check (status in ('pending', 'authorized', 'contingency', 'rejected', 'error', 'cancelled')),
  add column xml_cached text;
drop index public.fiscal_documents_live_idx;
create unique index fiscal_documents_live_idx on public.fiscal_documents (order_id)
  where status in ('pending', 'authorized', 'contingency', 'error');
create index fiscal_documents_contingency on public.fiscal_documents (shop_id) where status = 'contingency';

alter table public.fiscal_settings
  add column accountant_email text check (accountant_email is null or accountant_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');
