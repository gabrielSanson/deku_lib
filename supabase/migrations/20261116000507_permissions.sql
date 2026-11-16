-- S5.7: roles as sets of permissions, and a manager PIN for approvals. shop_members.role stays as
-- the "base role" (which screens an account lands on); role_id says what it may do.
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  name text not null check (length(name) between 1 and 40),
  system_key text check (system_key in ('dono', 'gerente', 'atendente', 'cozinha')),
  base_role text not null check (base_role in ('admin', 'attendant', 'kitchen')),
  created_at timestamptz not null default now(),
  unique (shop_id, name)
);
create unique index roles_system on public.roles (shop_id, system_key) where system_key is not null;

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  permission text not null,
  primary key (role_id, permission)
);

alter table public.shop_members add column role_id uuid references public.roles (id) on delete set null;

do $$
declare t text;
begin
  foreach t in array array['roles', 'role_permissions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to app_server using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id())',
      t || '_shop', t);
  end loop;
end $$;
