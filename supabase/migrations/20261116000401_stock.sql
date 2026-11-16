-- S4.1: recipe cost (ficha técnica) and stock. Quantities are in a base unit (g, ml or un);
-- costs are centavos × 10^6 per base unit so a gram of cheese keeps its precision.
create table public.stock_items (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  name text not null check (length(name) between 1 and 80),
  base_unit text not null check (base_unit in ('g', 'ml', 'un')),
  on_hand_base bigint not null default 0,
  min_base bigint not null default 0 check (min_base >= 0),
  avg_cost_micro bigint not null default 0 check (avg_cost_micro >= 0),
  -- When it runs out, the linked ingredient goes sold out (the existing availability logic).
  blocks_sale boolean not null default false,
  ingredient_id text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (shop_id, ingredient_id) references public.menu_ingredients (shop_id, id)
    on update cascade on delete set null (ingredient_id)
);
create unique index stock_items_name on public.stock_items (shop_id, lower(name));

-- One line per stock item used by a product or by an add-on option, per unit sold.
create table public.recipe_lines (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  product_sku text,
  option_sku text,
  stock_item_id uuid not null references public.stock_items (id) on delete cascade,
  qty_base integer not null check (qty_base > 0),
  -- Leaving this ingredient out ("Sem cebola") skips the line.
  ingredient_id text,
  check (num_nonnulls(product_sku, option_sku) = 1)
);
create index recipe_lines_product on public.recipe_lines (shop_id, product_sku);
create index recipe_lines_option on public.recipe_lines (shop_id, option_sku);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  stock_item_id uuid not null references public.stock_items (id) on delete cascade,
  kind text not null check (kind in ('sale', 'sale_reversal', 'purchase', 'count_adjust', 'waste')),
  qty_base bigint not null,
  unit_cost_micro bigint not null default 0,
  source text not null,
  source_id text not null,
  reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (shop_id, source, source_id, stock_item_id, kind)
);
create index stock_movements_item on public.stock_movements (shop_id, stock_item_id, created_at desc);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  supplier text,
  purchased_on date not null default current_date,
  total_cents integer not null default 0 check (total_cents >= 0),
  created_by uuid,
  created_at timestamptz not null default now()
);
create table public.purchase_lines (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  stock_item_id uuid not null references public.stock_items (id),
  qty_base bigint not null check (qty_base > 0),
  total_cents integer not null check (total_cents >= 0)
);

-- Which ingredient a "Sem …" line left out, so the recipe can skip it.
alter table public.order_item_modifiers add column ingredient_id text;

do $$
declare t text;
begin
  foreach t in array array['stock_items', 'recipe_lines', 'stock_movements', 'purchases', 'purchase_lines'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to app_server using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id())', t || '_shop', t);
  end loop;
end $$;
