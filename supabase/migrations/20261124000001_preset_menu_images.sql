-- A preset's sample menu can point at its built-in pictures (static/presets/<name>/...),
-- e.g. presets/cookie/products/red-velvet.svg, next to photos the owner uploads to Storage.
alter table public.menu_categories drop constraint menu_categories_image_path_check;
alter table public.menu_categories add constraint menu_categories_image_path_check
  check (image_path is null or image_path ~ '^[a-f0-9]{32}\.(jpg|png|webp)$'
    or image_path ~ '^presets/[a-z0-9-]+/[a-z0-9/-]+\.(svg|webp|png|jpg)$');

alter table public.menu_modifier_options drop constraint menu_modifier_options_image_path_check;
alter table public.menu_modifier_options add constraint menu_modifier_options_image_path_check
  check (image_path is null or image_path ~ '^[a-f0-9]{32}\.(jpg|png|webp)$'
    or image_path ~ '^presets/[a-z0-9-]+/[a-z0-9/-]+\.(svg|webp|png|jpg)$');
