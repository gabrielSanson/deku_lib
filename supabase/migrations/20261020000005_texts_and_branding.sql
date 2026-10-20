-- Customer-facing texts and the shop's look, edited by the owner in the staff
-- area. Defaults live in the app (src/lib/texts/catalog.ts and the brand files
-- in static/brand), so these tables hold only what the owner changed.

create table public.ui_texts (
  key text primary key check (key ~ '^[a-z][a-zA-Z0-9.]{0,99}$'),
  value text not null check (length(value) between 1 and 1000),
  updated_by uuid references public.staff_users (id),
  updated_at timestamptz not null default now()
);

create table public.store_branding (
  id smallint primary key default 1 check (id = 1),
  -- Hex colours, e.g. #ffbc00. Null keeps the built-in brand colour.
  color_primary text check (color_primary ~ '^#[0-9a-f]{6}$'),
  color_dark text check (color_dark ~ '^#[0-9a-f]{6}$'),
  color_background text check (color_background ~ '^#[0-9a-f]{6}$'),
  -- Object paths in the "menu" Storage bucket, served from /media/menu/.
  logo_path text,
  wordmark_path text,
  hero_logo_path text,
  icon_path text,
  updated_by uuid references public.staff_users (id),
  updated_at timestamptz not null default now()
);
insert into public.store_branding (id) values (1);

alter table public.ui_texts enable row level security;
alter table public.store_branding enable row level security;
