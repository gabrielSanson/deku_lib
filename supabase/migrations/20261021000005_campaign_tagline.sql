-- A short line under the campaign name on the staff list (mockup 09).
alter table public.campaigns
  add column tagline text not null default '' check (length(tagline) <= 80);
