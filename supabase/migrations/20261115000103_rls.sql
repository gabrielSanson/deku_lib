-- S1.1: Postgres keeps shops apart. The app reaches a shop's rows as role app_server with
-- app.shop_id set; every business table only shows and accepts that shop's rows.
-- Platform code (sign-up, console, billing, host lookup) runs as the owner role and sees everything.

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_server') then
    create role app_server nologin nobypassrls;
  end if;
end $$;
grant app_server to current_user;
grant usage on schema public to app_server;
grant select, insert, update, delete on all tables in schema public to app_server;
grant usage, select on all sequences in schema public to app_server;
grant execute on all functions in schema public to app_server;
alter default privileges in schema public grant select, insert, update, delete on tables to app_server;
alter default privileges in schema public grant usage, select on sequences to app_server;

-- Jobs are queued from inside a shop's work, and order linking reads auth.users.
do $$ begin
  grant usage on schema auth to app_server;
  grant select on auth.users to app_server;
exception when insufficient_privilege then
  raise notice 'could not grant auth.users to app_server; customer linking needs it in multi-shop mode';
end $$;
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'pgboss') then
    grant usage on schema pgboss to app_server;
    grant select, insert, update, delete on all tables in schema pgboss to app_server;
    grant usage, select on all sequences in schema pgboss to app_server;
  end if;
end $$;

create policy alert_settings_shop on public.alert_settings for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy alerts_shop on public.alerts for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy audit_log_shop on public.audit_log for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy campaigns_shop on public.campaigns for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy cash_movements_shop on public.cash_movements for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy cash_sessions_shop on public.cash_sessions for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy channel_outbound_shop on public.channel_outbound for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy content_pages_shop on public.content_pages for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy coupons_shop on public.coupons for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy customers_shop on public.customers for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy delivery_rules_shop on public.delivery_rules for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy fiscal_documents_shop on public.fiscal_documents for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy fiscal_settings_shop on public.fiscal_settings for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy ifood_settings_shop on public.ifood_settings for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy integration_mappings_shop on public.integration_mappings for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy menu_categories_shop on public.menu_categories for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy menu_ingredients_shop on public.menu_ingredients for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy menu_modifier_groups_shop on public.menu_modifier_groups for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy menu_modifier_options_shop on public.menu_modifier_options for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy menu_product_groups_shop on public.menu_product_groups for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy menu_product_ingredients_shop on public.menu_product_ingredients for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy menu_products_shop on public.menu_products for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy menu_revision_shop on public.menu_revision for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy order_addresses_shop on public.order_addresses for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy order_item_modifiers_shop on public.order_item_modifiers for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy order_items_shop on public.order_items for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy order_push_subscriptions_shop on public.order_push_subscriptions for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy order_status_history_shop on public.order_status_history for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy orders_shop on public.orders for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy product_availability_overrides_shop on public.product_availability_overrides for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy staff_push_subscriptions_shop on public.staff_push_subscriptions for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy store_branding_shop on public.store_branding for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy store_closures_shop on public.store_closures for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy store_hours_shop on public.store_hours for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy store_profile_shop on public.store_profile for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy store_runtime_settings_shop on public.store_runtime_settings for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy tenders_shop on public.tenders for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy payment_events_shop on public.payment_events for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy channel_events_shop on public.channel_events for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy shop_members_shop on public.shop_members for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy shop_counters_shop on public.shop_counters for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy ui_texts_shop on public.ui_texts for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());

-- Platform-level tables the app may read or write from a shop's work.
create policy backup_runs_app on public.backup_runs for all to app_server using (true) with check (true);
create policy system_heartbeats_app on public.system_heartbeats for all to app_server using (true) with check (true);
create policy ibs_cbs_rates_shop on public.ibs_cbs_rates for all to app_server
  using (shop_id is null or shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
create policy web_push_keys_app on public.web_push_keys for all to app_server using (true) with check (true);
create policy platform_config_read on public.platform_config for select to app_server using (true);
-- A shop's own record (name, status, preset) and domains are readable from its work; only platform code writes them.
create policy shops_own_read on public.shops for select to app_server using (id = public.current_shop_id());
create policy shop_domains_own_read on public.shop_domains for select to app_server using (shop_id = public.current_shop_id());
-- People: visible when they belong to the current shop; their name may be updated from it.
create policy staff_users_member on public.staff_users for all to app_server
  using (exists (select 1 from public.shop_members m where m.user_id = staff_users.id and m.shop_id = public.current_shop_id()))
  with check (true);
-- shop_secrets and platform_admins: no app_server policy, platform code only.

-- Realtime (staff browsers, role authenticated): only orders and settings of shops they work at.
create or replace function public.is_shop_member(p_shop uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shop_members m where m.user_id = auth.uid() and m.shop_id = p_shop and m.active)
$$;
revoke all on function public.is_shop_member(uuid) from public;
grant execute on function public.is_shop_member(uuid) to authenticated;

drop policy orders_staff_read on public.orders;
create policy orders_member_read on public.orders for select to authenticated using (public.is_shop_member(shop_id));
drop policy store_settings_staff_read on public.store_runtime_settings;
create policy store_settings_member_read on public.store_runtime_settings for select to authenticated
  using (public.is_shop_member(shop_id));
