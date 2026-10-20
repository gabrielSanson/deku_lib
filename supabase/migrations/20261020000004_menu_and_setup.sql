-- Menu, editorial pages and shop profile, edited in the staff area (replaces the
-- external CMS). Also the iFood connection settings entered in the setup wizard.
-- Like every other table, these are written only by the server.

-- ---------------------------------------------------------------------------
-- Menu
-- ---------------------------------------------------------------------------

create table public.menu_categories (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,59}$'),
  name text not null check (length(name) between 1 and 80),
  position integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.menu_products (
  sku text primary key check (sku ~ '^[A-Z0-9][A-Z0-9-]{0,39}$'),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  name text not null check (length(name) between 1 and 120),
  description text not null default '' check (length(description) <= 600),
  -- Object path in the "menu" Storage bucket.
  image_path text,
  category_id text not null references public.menu_categories (id) on update cascade,
  price_cents integer not null check (price_cents between 0 and 10000000),
  prep_station text not null default 'grill' check (prep_station in ('grill', 'fryer', 'counter', 'bar')),
  channels text[] not null default '{counter,web,ifood}' check (channels <@ '{counter,web,ifood}'::text[]),
  allergens text[] not null default '{}',
  position integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
create index menu_products_category_idx on public.menu_products (category_id, position);

create table public.menu_modifier_groups (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,59}$'),
  name text not null check (length(name) between 1 and 80),
  min_selections integer not null default 0 check (min_selections >= 0),
  max_selections integer not null default 1 check (max_selections >= 1 and max_selections >= min_selections),
  updated_at timestamptz not null default now()
);

create table public.menu_modifier_options (
  sku text primary key check (sku ~ '^[A-Z0-9][A-Z0-9-]{0,39}$'),
  group_id text not null references public.menu_modifier_groups (id) on delete cascade on update cascade,
  name text not null check (length(name) between 1 and 80),
  price_cents integer not null default 0 check (price_cents between 0 and 1000000),
  max_quantity integer not null default 1 check (max_quantity between 1 and 20),
  position integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
create index menu_modifier_options_group_idx on public.menu_modifier_options (group_id, position);

create table public.menu_product_groups (
  product_sku text not null references public.menu_products (sku) on delete cascade on update cascade,
  group_id text not null references public.menu_modifier_groups (id) on delete cascade on update cascade,
  position integer not null default 0,
  primary key (product_sku, group_id)
);

-- Bumped by the server on every menu change; orders record which menu priced them.
create table public.menu_revision (
  id smallint primary key default 1 check (id = 1),
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.menu_revision (id) values (1);

-- Customer-facing pages (about, allergens, privacy, delivery terms): plain text
-- blocks only, never raw HTML.
create table public.content_pages (
  slug text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{0,59}$'),
  title text not null check (length(title) between 1 and 120),
  blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array'),
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Shop profile and setup
-- ---------------------------------------------------------------------------

create table public.store_profile (
  id smallint primary key default 1 check (id = 1),
  display_name text check (display_name is null or length(display_name) between 1 and 80),
  phone text,
  address_line text,
  city text,
  -- Pix with the shop's own key: a static QR code, confirmed by staff by hand.
  pix_enabled boolean not null default false,
  pix_key text,
  pix_merchant_name text check (pix_merchant_name is null or length(pix_merchant_name) <= 25),
  pix_merchant_city text check (pix_merchant_city is null or length(pix_merchant_city) <= 15),
  setup_completed_at timestamptz,
  updated_by uuid references public.staff_users (id),
  updated_at timestamptz not null default now(),
  check (not pix_enabled or (pix_key is not null and pix_merchant_name is not null and pix_merchant_city is not null))
);
insert into public.store_profile (id) values (1);

-- iFood connection entered in the setup wizard. The client secret is encrypted
-- by the server with APP_SECRET before it is stored. Environment variables are
-- used instead when no credentials are saved here.
create table public.ifood_settings (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default false,
  client_id text,
  client_secret_enc text,
  merchant_id text,
  last_check_at timestamptz,
  last_check_ok boolean,
  last_check_error text,
  last_poll_ok_at timestamptz,
  last_poll_error_at timestamptz,
  last_poll_error text,
  updated_by uuid references public.staff_users (id),
  updated_at timestamptz not null default now()
);
insert into public.ifood_settings (id) values (1);

-- Web orders paid by Pix to the shop's own key: the customer scans a static QR
-- code and staff confirm the money arrived by recording an external_pix tender.
alter table public.orders drop constraint orders_payment_plan_check;
alter table public.orders add constraint orders_payment_plan_check
  check (payment_plan in ('counter', 'online', 'on_fulfillment', 'channel', 'pix_key'));

alter table public.menu_categories enable row level security;
alter table public.menu_products enable row level security;
alter table public.menu_modifier_groups enable row level security;
alter table public.menu_modifier_options enable row level security;
alter table public.menu_product_groups enable row level security;
alter table public.menu_revision enable row level security;
alter table public.content_pages enable row level security;
alter table public.store_profile enable row level security;
alter table public.ifood_settings enable row level security;
