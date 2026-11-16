-- S3.2: automatic Pix through a PSP on the Banco Central Pix API (Efí first). The client secret,
-- the certificate, its password and our webhook token are in shop_secrets.
alter table public.payment_settings drop constraint payment_settings_provider_check,
  add constraint payment_settings_provider_check
    check (provider in ('none', 'mercadopago', 'local_stub', 'efi'));
alter table public.payment_settings
  add column psp_client_id text,
  add column psp_pix_key text,
  add column psp_sandbox boolean not null default false,
  add column psp_webhook_at timestamptz;
