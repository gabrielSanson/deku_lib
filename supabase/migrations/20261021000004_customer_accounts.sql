-- Customer accounts: a sign-in (Supabase Auth, e-mail and password or Google) is
-- linked to one customer record. Past guest orders stay on that record, matched
-- by phone when the customer signs up with the same number.
alter table public.customers
  add column auth_user_id uuid unique references auth.users (id) on delete set null;
