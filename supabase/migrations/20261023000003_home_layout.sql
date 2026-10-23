-- The home page, edited in Configurações → Página inicial: the hero's background
-- photo and the layout choices (alignment, buttons and which blocks show).
-- Texts stay in ui_texts. An empty object keeps every built-in choice.
alter table public.store_branding
  add column hero_image_path text,
  add column home_layout jsonb not null default '{}'::jsonb;
