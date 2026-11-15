-- Accounts link to past guest orders by verified e-mail only. A phone typed at sign-up that
-- already belongs to someone else's record is kept here as a contact number and links nothing.
alter table public.customers add column contact_phone_e164 text;

create index customers_email_idx on public.customers (lower(email))
  where email is not null and deleted_at is null;
