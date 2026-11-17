-- S5.9: the owner can make two-step sign-in (TOTP, Supabase Auth MFA) mandatory for the people who
-- manage settings or the team.
alter table public.store_runtime_settings
  add column require_admin_mfa boolean not null default false;
