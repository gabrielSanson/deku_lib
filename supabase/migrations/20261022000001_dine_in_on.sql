-- The shop has seating: "comer no salão" is offered next to "para viagem" by
-- default. Shops without seating switch it off in Configurações → Loja.
alter table public.store_runtime_settings alter column dine_in_enabled set default true;
update public.store_runtime_settings set dine_in_enabled = true;
