-- Removed ingredients ("Sem cebola") are told apart by a kind, not by the "Sem " prefix, so an
-- add-on that happens to be called "Sem glúten" is still an add-on.
alter table public.order_item_modifiers
  add column kind text not null default 'add' check (kind in ('add', 'remove'));

update public.order_item_modifiers set kind = 'remove'
  where option_sku is null and option_name like 'Sem %';
