-- Campaign photo for the campaign list and the storefront banner. Same path format as product photos.
alter table campaigns add column image_path text
  check (image_path is null or image_path ~ '^[a-f0-9]{32}\.(jpg|png|webp)$');
