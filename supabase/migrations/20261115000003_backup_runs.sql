-- One row per nightly dump and per weekly restore test, written by deploy/backup/*.sh.
-- Configurações → Sistema reads it to show whether the backups are working.
create table public.backup_runs (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('dump', 'restore_test')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean not null default false,
  bytes bigint,
  offsite boolean not null default false,
  detail jsonb not null default '{}'::jsonb,
  error text
);
create index backup_runs_kind_idx on public.backup_runs (kind, started_at desc);
alter table public.backup_runs enable row level security;
