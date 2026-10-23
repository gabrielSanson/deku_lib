-- More images the owner can replace from the dashboard: the photo beside the customer
-- sign-in form, the staff sign-in background, and small photos for ingredients and
-- add-on options (shown in the product sheet). Same storage path format as menu photos.
alter table public.store_branding
  add column login_image_path text,
  add column staff_background_path text;

alter table public.menu_ingredients add column image_path text
  check (image_path is null or image_path ~ '^[a-f0-9]{32}\.(jpg|png|webp)$');

alter table public.menu_modifier_options add column image_path text
  check (image_path is null or image_path ~ '^[a-f0-9]{32}\.(jpg|png|webp)$');
