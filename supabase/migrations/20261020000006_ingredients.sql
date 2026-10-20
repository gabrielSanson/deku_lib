-- Ingredients: what each product is made of. Customers can leave out removable
-- ones ("sem cebola"); when an ingredient runs out, every product that cannot be
-- made without it is unavailable. Written only by the server, like the menu.

create table public.menu_ingredients (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,59}$'),
  name text not null check (length(name) between 1 and 80),
  allergens text[] not null default '{}',
  position integer not null default 0,
  -- Operational: flipped mid-shift from the availability screen, not a menu edit.
  available boolean not null default true,
  unavailable_at timestamptz,
  updated_by uuid references public.staff_users (id),
  updated_at timestamptz not null default now()
);

create table public.menu_product_ingredients (
  product_sku text not null references public.menu_products (sku) on delete cascade on update cascade,
  ingredient_id text not null references public.menu_ingredients (id) on delete cascade on update cascade,
  removable boolean not null default true,
  position integer not null default 0,
  primary key (product_sku, ingredient_id)
);
create index menu_product_ingredients_ingredient_idx on public.menu_product_ingredients (ingredient_id);

alter table public.menu_ingredients enable row level security;
alter table public.menu_product_ingredients enable row level security;
