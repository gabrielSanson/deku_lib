-- S5.8: the week's schedule (escala) and the time clock (ponto). An internal control, not a
-- certified electronic time clock (REP).
create table public.work_shifts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  member_user_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at - starts_at <= interval '16 hours')
);
create index work_shifts_week on public.work_shifts (shop_id, starts_at);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  member_user_id uuid not null,
  clock_in_at timestamptz not null default now(),
  clock_out_at timestamptz,
  device text,
  check (clock_out_at is null or clock_out_at > clock_in_at)
);
create unique index time_entries_open on public.time_entries (shop_id, member_user_id) where clock_out_at is null;
create index time_entries_week on public.time_entries (shop_id, clock_in_at);

do $$
declare t text;
begin
  foreach t in array array['work_shifts', 'time_entries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to app_server using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id())',
      t || '_shop', t);
  end loop;
end $$;
