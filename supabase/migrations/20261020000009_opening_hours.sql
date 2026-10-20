-- Opening hours: the site takes orders only inside them (when switched on). The
-- manual pause still wins. Closing earlier than opening means past midnight.
alter table public.store_runtime_settings add column hours_enabled boolean not null default false;

create table public.store_hours (
  id bigint generated always as identity primary key,
  weekday smallint not null check (weekday between 0 and 6),
  opens time not null,
  closes time not null
);
create index store_hours_weekday_idx on public.store_hours (weekday);

create table public.store_closures (
  day date primary key,
  reason text check (reason is null or length(reason) <= 80)
);

alter table public.store_hours enable row level security;
alter table public.store_closures enable row level security;
