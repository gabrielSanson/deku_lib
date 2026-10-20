-- Two staff roles: admin (runs the shop) and kitchen (sees the kitchen screen).
-- Owners, managers and cashiers all become admins. Customers have no account.
alter table public.staff_users drop constraint staff_users_role_check;
update public.staff_users set role = 'admin' where role in ('owner', 'manager', 'cashier');
alter table public.staff_users add constraint staff_users_role_check check (role in ('admin', 'kitchen'));
