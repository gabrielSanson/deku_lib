-- S3.7: "Como foi?" one hour after an order is completed. Ratings are private: staff see them,
-- low ones (3 stars or fewer) are flagged until someone marks them seen. Never published.
create table public.order_ratings (
  order_id uuid primary key references public.orders (id) on delete cascade,
  shop_id uuid not null default public.current_shop_id() references public.shops (id),
  stars smallint not null check (stars between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  seen_by uuid
);
create index order_ratings_recent on public.order_ratings (shop_id, created_at desc);
alter table public.order_ratings enable row level security;
create policy order_ratings_shop on public.order_ratings for all to app_server
  using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());

-- The "Como foi?" message goes out once per order, whatever the job retries.
alter table public.orders add column rating_requested_at timestamptz;
