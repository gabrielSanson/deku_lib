-- S4.4: expenses and the monthly result (DRE simplificado).
create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  name text not null check (length(name) between 1 and 60),
  pl_line text not null check (pl_line in ('cmv', 'pessoal', 'ocupacao', 'marketing', 'taxas', 'impostos', 'outros')),
  active boolean not null default true
);
create unique index expense_categories_name on public.expense_categories (shop_id, lower(name));

create table public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  category_id uuid not null references public.expense_categories (id),
  description text not null check (length(description) between 1 and 120),
  amount_cents integer not null check (amount_cents > 0),
  day_of_month integer not null default 5 check (day_of_month between 1 and 28),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  category_id uuid not null references public.expense_categories (id),
  description text not null check (length(description) between 1 and 120),
  amount_cents integer not null check (amount_cents > 0),
  -- The month the expense belongs to (first day), whatever day it was paid.
  competence_month date not null check (extract(day from competence_month) = 1),
  paid_at date,
  recurring_id uuid references public.recurring_expenses (id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index expenses_month on public.expenses (shop_id, competence_month);
-- A recurring expense is entered once per month, whatever the job retries.
create unique index expenses_recurring_month on public.expenses (recurring_id, competence_month)
  where recurring_id is not null;

do $$
declare t text;
begin
  foreach t in array array['expense_categories', 'recurring_expenses', 'expenses'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to app_server using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id())', t || '_shop', t);
  end loop;
end $$;
