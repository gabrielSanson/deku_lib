-- S1.1: every business table gets shop_id; natural keys, uniques and indexes become per shop.
-- Existing rows go to the default shop. shop_id defaults to current_shop_id(), so the app does not
-- have to pass it: a shop's connection (or the single-shop fallback) fills it in.
-- Platform-level tables keep no shop_id: backup_runs, system_heartbeats, web_push_keys (one VAPID
-- pair for the install) and staff_users (one row per person; the role per shop is in shop_members).
-- ibs_cbs_rates gets an optional shop_id (section 8).

-- 1. The column, filled for existing rows, then defaulting to the current shop.
alter table public.alert_settings add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.alert_settings alter column shop_id set default public.current_shop_id();
alter table public.alerts add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.alerts alter column shop_id set default public.current_shop_id();
alter table public.audit_log add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.audit_log alter column shop_id set default public.current_shop_id();
alter table public.campaigns add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.campaigns alter column shop_id set default public.current_shop_id();
alter table public.cash_movements add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.cash_movements alter column shop_id set default public.current_shop_id();
alter table public.cash_sessions add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.cash_sessions alter column shop_id set default public.current_shop_id();
alter table public.channel_outbound add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.channel_outbound alter column shop_id set default public.current_shop_id();
alter table public.content_pages add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.content_pages alter column shop_id set default public.current_shop_id();
alter table public.coupons add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.coupons alter column shop_id set default public.current_shop_id();
alter table public.customers add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.customers alter column shop_id set default public.current_shop_id();
alter table public.delivery_rules add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.delivery_rules alter column shop_id set default public.current_shop_id();
alter table public.fiscal_documents add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.fiscal_documents alter column shop_id set default public.current_shop_id();
alter table public.fiscal_settings add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.fiscal_settings alter column shop_id set default public.current_shop_id();
alter table public.ifood_settings add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.ifood_settings alter column shop_id set default public.current_shop_id();
alter table public.integration_mappings add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.integration_mappings alter column shop_id set default public.current_shop_id();
alter table public.menu_categories add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.menu_categories alter column shop_id set default public.current_shop_id();
alter table public.menu_ingredients add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.menu_ingredients alter column shop_id set default public.current_shop_id();
alter table public.menu_modifier_groups add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.menu_modifier_groups alter column shop_id set default public.current_shop_id();
alter table public.menu_modifier_options add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.menu_modifier_options alter column shop_id set default public.current_shop_id();
alter table public.menu_product_groups add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.menu_product_groups alter column shop_id set default public.current_shop_id();
alter table public.menu_product_ingredients add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.menu_product_ingredients alter column shop_id set default public.current_shop_id();
alter table public.menu_products add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.menu_products alter column shop_id set default public.current_shop_id();
alter table public.menu_revision add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.menu_revision alter column shop_id set default public.current_shop_id();
alter table public.order_addresses add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.order_addresses alter column shop_id set default public.current_shop_id();
alter table public.order_item_modifiers add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.order_item_modifiers alter column shop_id set default public.current_shop_id();
alter table public.order_items add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.order_items alter column shop_id set default public.current_shop_id();
alter table public.order_push_subscriptions add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.order_push_subscriptions alter column shop_id set default public.current_shop_id();
alter table public.order_status_history add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.order_status_history alter column shop_id set default public.current_shop_id();
alter table public.orders add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.orders alter column shop_id set default public.current_shop_id();
alter table public.product_availability_overrides add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.product_availability_overrides alter column shop_id set default public.current_shop_id();
alter table public.staff_push_subscriptions add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.staff_push_subscriptions alter column shop_id set default public.current_shop_id();
alter table public.store_branding add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.store_branding alter column shop_id set default public.current_shop_id();
alter table public.store_closures add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.store_closures alter column shop_id set default public.current_shop_id();
alter table public.store_hours add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.store_hours alter column shop_id set default public.current_shop_id();
alter table public.store_profile add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.store_profile alter column shop_id set default public.current_shop_id();
alter table public.store_runtime_settings add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.store_runtime_settings alter column shop_id set default public.current_shop_id();
alter table public.tenders add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.tenders alter column shop_id set default public.current_shop_id();
alter table public.ui_texts add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references public.shops (id);
alter table public.ui_texts alter column shop_id set default public.current_shop_id();
alter table public.payment_events add column shop_id uuid references public.shops (id);
update public.payment_events set shop_id = '00000000-0000-4000-8000-000000000001';
alter table public.payment_events alter column shop_id set default public.current_shop_id();
alter table public.channel_events add column shop_id uuid references public.shops (id);
update public.channel_events set shop_id = '00000000-0000-4000-8000-000000000001';
alter table public.channel_events alter column shop_id set default public.current_shop_id();

-- 2. One settings row per shop instead of one row with id = 1. The id column stays (always 1).
alter table public.alert_settings drop constraint alert_settings_id_check;
alter table public.alert_settings drop constraint alert_settings_pkey;
alter table public.alert_settings add primary key (shop_id);
alter table public.fiscal_settings drop constraint fiscal_settings_id_check;
alter table public.fiscal_settings drop constraint fiscal_settings_pkey;
alter table public.fiscal_settings add primary key (shop_id);
alter table public.ifood_settings drop constraint ifood_settings_id_check;
alter table public.ifood_settings drop constraint ifood_settings_pkey;
alter table public.ifood_settings add primary key (shop_id);
alter table public.menu_revision drop constraint menu_revision_id_check;
alter table public.menu_revision drop constraint menu_revision_pkey;
alter table public.menu_revision add primary key (shop_id);
alter table public.store_branding drop constraint store_branding_id_check;
alter table public.store_branding drop constraint store_branding_pkey;
alter table public.store_branding add primary key (shop_id);
alter table public.store_profile drop constraint store_profile_id_check;
alter table public.store_profile drop constraint store_profile_pkey;
alter table public.store_profile add primary key (shop_id);
alter table public.store_runtime_settings drop constraint store_runtime_settings_id_check;
alter table public.store_runtime_settings drop constraint store_runtime_settings_pkey;
alter table public.store_runtime_settings add primary key (shop_id);

-- 3. Text keys become per shop, and the menu's foreign keys carry the shop.
alter table public.menu_modifier_options drop constraint menu_modifier_options_group_id_fkey;
alter table public.menu_product_groups drop constraint menu_product_groups_product_sku_fkey;
alter table public.menu_product_groups drop constraint menu_product_groups_group_id_fkey;
alter table public.menu_product_ingredients drop constraint menu_product_ingredients_product_sku_fkey;
alter table public.menu_product_ingredients drop constraint menu_product_ingredients_ingredient_id_fkey;
alter table public.menu_products drop constraint menu_products_category_id_fkey;

alter table public.menu_categories drop constraint menu_categories_pkey, add primary key (shop_id, id);
alter table public.menu_ingredients drop constraint menu_ingredients_pkey, add primary key (shop_id, id);
alter table public.menu_modifier_groups drop constraint menu_modifier_groups_pkey, add primary key (shop_id, id);
alter table public.menu_modifier_options drop constraint menu_modifier_options_pkey, add primary key (shop_id, sku);
alter table public.menu_products drop constraint menu_products_pkey, add primary key (shop_id, sku);
alter table public.menu_products drop constraint menu_products_slug_key, add constraint menu_products_slug_key unique (shop_id, slug);
alter table public.menu_product_groups drop constraint menu_product_groups_pkey, add primary key (shop_id, product_sku, group_id);
alter table public.menu_product_ingredients drop constraint menu_product_ingredients_pkey, add primary key (shop_id, product_sku, ingredient_id);
alter table public.content_pages drop constraint content_pages_pkey, add primary key (shop_id, slug);
alter table public.ui_texts drop constraint ui_texts_pkey, add primary key (shop_id, key);
alter table public.product_availability_overrides drop constraint product_availability_overrides_pkey, add primary key (shop_id, sku, channel);
alter table public.store_closures drop constraint store_closures_pkey, add primary key (shop_id, day);

alter table public.menu_modifier_options add constraint menu_modifier_options_group_id_fkey
  foreign key (shop_id, group_id) references public.menu_modifier_groups (shop_id, id) on update cascade on delete cascade;
alter table public.menu_product_groups add constraint menu_product_groups_product_sku_fkey
  foreign key (shop_id, product_sku) references public.menu_products (shop_id, sku) on update cascade on delete cascade;
alter table public.menu_product_groups add constraint menu_product_groups_group_id_fkey
  foreign key (shop_id, group_id) references public.menu_modifier_groups (shop_id, id) on update cascade on delete cascade;
alter table public.menu_product_ingredients add constraint menu_product_ingredients_product_sku_fkey
  foreign key (shop_id, product_sku) references public.menu_products (shop_id, sku) on update cascade on delete cascade;
alter table public.menu_product_ingredients add constraint menu_product_ingredients_ingredient_id_fkey
  foreign key (shop_id, ingredient_id) references public.menu_ingredients (shop_id, id) on update cascade on delete cascade;
alter table public.menu_products add constraint menu_products_category_id_fkey
  foreign key (shop_id, category_id) references public.menu_categories (shop_id, id) on update cascade;

-- 4. Uniques per shop.
alter table public.orders drop constraint orders_order_number_key, add constraint orders_order_number_key unique (shop_id, order_number);
alter table public.orders drop constraint orders_channel_channel_order_id_key, add constraint orders_channel_channel_order_id_key unique (shop_id, channel, channel_order_id);
alter table public.orders drop constraint orders_idempotency_key_key, add constraint orders_idempotency_key_key unique (shop_id, idempotency_key);
alter table public.tenders drop constraint tenders_idempotency_key_key, add constraint tenders_idempotency_key_key unique (shop_id, idempotency_key);
alter table public.customers drop constraint customers_auth_user_id_key, add constraint customers_auth_user_id_key unique (shop_id, auth_user_id);
alter table public.delivery_rules drop constraint delivery_rules_match_kind_match_value_key, add constraint delivery_rules_match_kind_match_value_key unique (shop_id, match_kind, match_value);
alter table public.integration_mappings drop constraint integration_mappings_channel_entity_type_external_id_key,
  add constraint integration_mappings_channel_entity_type_external_id_key unique (shop_id, channel, entity_type, external_id);
alter table public.integration_mappings drop constraint integration_mappings_channel_entity_type_internal_sku_key,
  add constraint integration_mappings_channel_entity_type_internal_sku_key unique (shop_id, channel, entity_type, internal_sku);
drop index public.coupons_code_idx;
create unique index coupons_code_idx on public.coupons (shop_id, code);
drop index public.customers_phone_idx;
create unique index customers_phone_idx on public.customers (shop_id, phone_e164) where phone_e164 is not null and deleted_at is null;
drop index public.alerts_one_open_idx;
create unique index alerts_one_open_idx on public.alerts (shop_id, kind) where resolved_at is null;
drop index public.cash_sessions_one_open_idx;
create unique index cash_sessions_one_open_idx on public.cash_sessions (shop_id) where status = 'open';

-- 5. People keep one staff_users row (names for history); the role per shop is in shop_members.
insert into public.shop_members (shop_id, user_id, role, display_name, active, created_at)
select '00000000-0000-4000-8000-000000000001', id, role, display_name, active, created_at from public.staff_users
on conflict do nothing;

-- 6. Order numbers count per shop.
insert into public.shop_counters (shop_id, name, value)
select '00000000-0000-4000-8000-000000000001', 'order_number', coalesce((select max(order_number) from public.orders), 1000);

create or replace function public.next_shop_counter(p_shop uuid, p_name text, p_start bigint default 1001)
returns bigint language plpgsql as $$
declare v bigint;
begin
  update public.shop_counters set value = value + 1 where shop_id = p_shop and name = p_name returning value into v;
  if v is null then
    insert into public.shop_counters (shop_id, name, value) values (p_shop, p_name, p_start)
    on conflict (shop_id, name) do update set value = shop_counters.value + 1
    returning value into v;
  end if;
  return v;
end $$;

create or replace function public.orders_set_number() returns trigger language plpgsql as $$
begin
  if new.order_number is null then
    new.order_number := public.next_shop_counter(new.shop_id, 'order_number');
  end if;
  return new;
end $$;
alter table public.orders alter column order_number drop default;
create trigger orders_set_number before insert on public.orders
  for each row execute function public.orders_set_number();
drop sequence public.order_number_seq;

-- 7. Indexes lead with the shop.
drop index public.audit_log_created_idx;
create index audit_log_created_idx on public.audit_log (shop_id, created_at);
drop index public.audit_log_object_idx;
create index audit_log_object_idx on public.audit_log (shop_id, object_type, object_id, created_at);
drop index public.campaigns_live_idx;
create index campaigns_live_idx on public.campaigns (shop_id, status) where status = 'active';
drop index public.cash_sessions_opened_idx;
create index cash_sessions_opened_idx on public.cash_sessions (shop_id, opened_at);
drop index public.channel_outbound_status_idx;
create index channel_outbound_status_idx on public.channel_outbound (shop_id, status, created_at);
drop index public.fiscal_documents_created_idx;
create index fiscal_documents_created_idx on public.fiscal_documents (shop_id, created_at);
drop index public.menu_modifier_options_group_idx;
create index menu_modifier_options_group_idx on public.menu_modifier_options (shop_id, group_id, position);
drop index public.menu_product_ingredients_ingredient_idx;
create index menu_product_ingredients_ingredient_idx on public.menu_product_ingredients (shop_id, ingredient_id);
drop index public.menu_products_category_idx;
create index menu_products_category_idx on public.menu_products (shop_id, category_id, position);
drop index public.order_items_sku_idx;
create index order_items_sku_idx on public.order_items (shop_id, product_sku);
drop index public.order_status_history_to_idx;
create index order_status_history_to_idx on public.order_status_history (shop_id, to_status, occurred_at);
drop index public.orders_channel_created_idx;
create index orders_channel_created_idx on public.orders (shop_id, channel, created_at);
drop index public.orders_status_created_idx;
create index orders_status_created_idx on public.orders (shop_id, status, created_at);
drop index public.orders_promised_idx;
create index orders_promised_idx on public.orders (shop_id, promised_at);
drop index public.orders_unpaid_new_idx;
create index orders_unpaid_new_idx on public.orders (shop_id, created_at) where status = 'new' and payment_status <> 'paid';
drop index public.orders_created_idx;
create index orders_created_idx on public.orders (shop_id, created_at);
drop index public.orders_customer_created_idx;
create index orders_customer_created_idx on public.orders (shop_id, customer_id, created_at);
drop index public.store_hours_weekday_idx;
create index store_hours_weekday_idx on public.store_hours (shop_id, weekday);
drop index public.tenders_pending_idx;
create index tenders_pending_idx on public.tenders (shop_id, status, expires_at) where status = 'pending';
drop index public.tenders_created_idx;
create index tenders_created_idx on public.tenders (shop_id, created_at);
drop index public.customers_email_idx;
create index customers_email_idx on public.customers (shop_id, lower(email)) where email is not null and deleted_at is null;

-- 8. IBS/CBS rates: the national rows (shop_id null) ship with the app; a shop's saved rows
-- (its accountant's confirmation) override them for that shop.
alter table public.ibs_cbs_rates add column shop_id uuid references public.shops (id) on delete cascade;
alter table public.ibs_cbs_rates drop constraint ibs_cbs_rates_pkey;
create unique index ibs_cbs_rates_year_idx on public.ibs_cbs_rates (year, shop_id) nulls not distinct;

-- 9. A new shop gets its settings rows (all columns at their defaults) and an order counter.
create or replace function public.init_shop_rows(p_shop uuid) returns void language plpgsql as $$
begin
  insert into public.store_runtime_settings (id, shop_id) values (1, p_shop) on conflict do nothing;
  insert into public.store_profile (id, shop_id) values (1, p_shop) on conflict do nothing;
  insert into public.store_branding (id, shop_id) values (1, p_shop) on conflict do nothing;
  insert into public.menu_revision (id, shop_id) values (1, p_shop) on conflict do nothing;
  insert into public.ifood_settings (id, shop_id) values (1, p_shop) on conflict do nothing;
  insert into public.fiscal_settings (id, shop_id) values (1, p_shop) on conflict do nothing;
  insert into public.alert_settings (id, shop_id) values (1, p_shop) on conflict do nothing;
  insert into public.shop_counters (shop_id, name, value) values (p_shop, 'order_number', 1000)
    on conflict do nothing;
end $$;
