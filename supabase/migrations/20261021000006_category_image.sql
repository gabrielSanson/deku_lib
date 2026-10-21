-- Category photos for the home page tiles. Same storage path format as product photos.
alter table menu_categories add column image_path text
  check (image_path is null or image_path ~ '^[a-f0-9]{32}\.(jpg|png|webp)$');
