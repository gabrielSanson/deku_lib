-- S5.4: delivery fee by distance. A 'radius_km' rule matches addresses within radius_m of the
-- shop (store_profile.lat/lng); coordinates come from OpenStreetMap's Nominatim, cached here.
alter table public.delivery_rules drop constraint delivery_rules_match_kind_check,
  add constraint delivery_rules_match_kind_check check (match_kind in ('cep_prefix', 'neighborhood', 'radius_km')),
  add column radius_m integer check (radius_m is null or radius_m between 100 and 100000),
  add constraint delivery_rules_radius check ((match_kind = 'radius_km') = (radius_m is not null));

alter table public.store_profile
  add column lat double precision check (lat is null or lat between -90 and 90),
  add column lng double precision check (lng is null or lng between -180 and 180);

-- Shared by every shop: an address has the same coordinates whoever asks. Not shop data.
create table public.geocode_cache (
  query text primary key,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);
alter table public.geocode_cache enable row level security;
create policy geocode_cache_all on public.geocode_cache for all to app_server using (true) with check (true);
