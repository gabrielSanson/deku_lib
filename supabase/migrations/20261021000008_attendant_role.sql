-- Third staff role: atendente runs the counter and the order board, but not the back office.
alter table public.staff_users drop constraint staff_users_role_check;
alter table public.staff_users add constraint staff_users_role_check
  check (role in ('admin', 'attendant', 'kitchen'));
