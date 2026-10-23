# Redesign and refactor: release notes and rollback

Work shipped in October 2026. Nothing here changes data or the database; every change is in the
screens and their components, so a rollback is a normal `git revert`.

## What changed for customers

- **Home:** the tossed-burger banner, a three-burger quick menu and a "Ver cardápio" button (#32, #34).
- **Menu:** no docked cart; the cart opens from the header icon and the bottom bar (#35).
- **Dish page:** option status pills and the validation message inside the fixed bottom bar (#33).
- **Checkout:** five guided steps (how to receive, address, your details, payment, review) with the
  total fixed at the bottom on every step (#42).
- **Pix payment:** one card with the total, QR code, copy button and expiry (e32dd8a).

## What changed for staff

- **Navigation:** one `StaffNav` and one `StaffTopbar` for desktop and phone (#36, #37).
- **Dashboard:** urgent alerts in `UrgentAlertStrip` (e9cd509).
- **Orders board:** `OrderLane` (ec9a150). **Order detail:** `OrderActionBar` (2a4c11b).
- **Settings:** `SettingsSection` with the unsaved-changes warning, on Dados e Pix and Operação
  (5d67bac, c782ba8). The product editor has the same warning (#39) and a live preview of how the
  dish looks on the menu (2cd7f6d).
- **Reports:** `AnalyticsMetric` and `DailySalesChart` (a34d386); reconciliation reuses the tile (c6aaea6).
- **Counter (Caixa):** `POSProductGrid` and `POSTicketLines` (e6b622c).
- **Campaigns:** ending a campaign asks in a dialog (ef09a54).
- **Product photos:** a picked photo is centre-cropped to the menu's 4:3 shape and shrunk in the browser before upload.
- **Kitchen and setup wizard:** all copy now comes from the text catalog, so it can be edited in
  Configurações → Textos (#38, #41). The setup progress rail is its own component (#40).

- **Decisions closed (23 Oct):** the menu page is a black field with cream cards (mockup 02) in
  both themes; the home featured row is four across on desktop (owner picks 4 or 8); Minha conta
  has "Pedir de novo", which refills the cart from today's menu and names what is unavailable.

## Not done

- Pixel-baseline sign-off for the visual tests (needs the owner).
- Reordering the home page's blocks (waits for the storefront CMS).
- Keyboard-journey and responsive review passes beyond what the e2e and accessibility scans cover.

## Rollback

Every change is a separate commit on `main`. To undo one: `git revert <sha>` and push. To undo the
checkout steps only: `git revert 5187b6e`. Reverting a screen never touches orders or settings data.
