-- Cash drawer sessions. The drawer is opened with a float; cash sales, refunds,
-- withdrawals (sangria) and top-ups (suprimento) are recorded as movements; closing
-- compares a blind count with what the movements say should be in the drawer.
-- The shop has one drawer, so at most one session is open at a time.
create table public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'open' check (status in ('open', 'closed')),
  opened_by uuid not null references public.staff_users (id),
  opened_at timestamptz not null default now(),
  opening_float_cents integer not null check (opening_float_cents >= 0),
  closed_by uuid references public.staff_users (id),
  closed_at timestamptz,
  counted_cents integer check (counted_cents >= 0),
  expected_cents integer,
  difference_cents integer,
  close_note text,
  check ((status = 'open') = (closed_at is null))
);
create unique index cash_sessions_one_open_idx on public.cash_sessions ((true)) where status = 'open';
create index cash_sessions_opened_idx on public.cash_sessions (opened_at);

-- Signed amounts: money into the drawer is positive, money out is negative.
create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.cash_sessions (id),
  kind text not null check (kind in ('sale', 'refund', 'sangria', 'suprimento')),
  amount_cents integer not null check (amount_cents <> 0),
  tender_id uuid references public.tenders (id),
  reason text,
  recorded_by uuid references public.staff_users (id),
  created_at timestamptz not null default now(),
  check ((kind in ('sale', 'refund')) = (tender_id is not null))
);
create unique index cash_movements_tender_kind_idx on public.cash_movements (tender_id, kind)
  where tender_id is not null;
create index cash_movements_session_idx on public.cash_movements (session_id, created_at);

alter table public.cash_sessions enable row level security;
alter table public.cash_movements enable row level security;
