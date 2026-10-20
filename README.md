# Deku Burger platform

Ordering and operations for one burger shop in Brazil: counter POS, web ordering
with pickup and delivery, kitchen display (KDS), menu editor, iFood channel,
payment reconciliation and analytics. It runs entirely on the shop's own server
on top of self-hosted Supabase; there is no cloud host and no paid licence. Staff screens and customer pages are pt-BR; money is
stored as integer centavos (BRL) and every "day" is a day in `America/Sao_Paulo`.

> **Status.** Counter, web ordering, KDS, menu editor, setup wizard, settings,
> reconciliation and analytics work end to end on self-hosted Supabase. Web
> customers can pay on pickup/delivery or by **Pix to the shop's own key** (staff
> confirm it by hand). **No payment provider (PSP) is connected**, so there is no
> automatic online payment. **iFood is optional and off by default**: it was
> written from iFood's public docs and has not been homologated. See
> [Known gates](#known-gates) before going live.

## What is in here

| Area                                        | Where                                                | Notes                                                         |
| ------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| Web app (SvelteKit 3, Svelte 5, Tailwind 4) | `src/routes`                                         | `(shop)` customer site, `staff/` back office, `kitchen/` KDS  |
| Domain rules (pure, unit tested)            | `src/lib/domain`                                     | order states, pricing, money, phone, time                     |
| Server services                             | `src/lib/server`                                     | the only code that writes orders, tenders, settings           |
| Worker (pg-boss)                            | `scripts/worker.ts`, `src/lib/server/worker`         | payment events, checkout expiry, iFood polling and sync       |
| Schema                                      | `supabase/migrations`                                | Postgres + RLS; realtime publication on `orders`              |
| Menu editor and setup wizard                | `src/routes/staff/(app)/menu`, `.../setup`           | categories, products, photos, options, pages; first-run setup |
| Tests                                       | `src/**/*.spec.ts`, `tests/integration`, `tests/e2e` | unit, DB integration, Playwright                              |
| Deploy (own server)                         | `deploy/`, `Dockerfile`                              | self-hosted Supabase + shop + Caddy, one command              |

### How it fits together

- **Self-hosted Supabase** (in `deploy/supabase`) holds the database, staff login
  (Supabase Auth), Realtime and menu photos (Storage). The browser only ever gets
  the anon key; the service-role key stays on the server. Staff can read `orders`
  through RLS for live updates; all writes go through server actions.
- **The menu lives in the app's own tables** and is edited in the staff area
  (Cardápio → Editar cardápio): categories, products, photos, option groups and
  the site's text pages. Prices are read on the server and re-checked at order
  time; the browser never sets a price. Every edit bumps a menu revision that
  orders record. Photos go to a private Storage bucket and are served by the app
  at `/media/menu/…`.
- **The setup wizard** (`/staff/setup`, owner only) walks through store details,
  menu, pickup/delivery, team, payments (including the Pix key) and iFood. The
  owner is pointed to it until it is finished.
- **pg-boss** runs in the same Postgres. Jobs that follow a data change are
  enqueued in the same transaction (no outbox table): a committed order always
  has its follow-up job. Delivery is at least once, so every handler is idempotent.
- **Realtime is a hint, not the source of truth.** Staff screens refetch from the
  server when a change arrives, poll every 8 s as a fallback, and show a banner
  when the live connection drops.

### Order and payment model

Order status: `new → confirmed → preparing → ready → completed`, plus
`cancelled` and `rejected`. Payment status is tracked separately: `pending`, `paid`, `failed`,
`cancelled`, `refunded` and `unknown`. Counter orders start `confirmed`. Web
orders paid online are confirmed by the payment webhook. Pay-on-pickup and iFood
orders wait in `new` for staff to accept them.

Counter tenders are recorded manually, each with a reference: cash (with change),
counter Pix, card terminal, and SoftPOS ("Tap to Pay" in the PSP's own app). The
app never reads card data.

**Pix to the shop's own key** (payment plan `pix_key`): the payment page shows a
static BR Code (EMV, CRC16) with the amount and `PEDIDO<number>` as reference,
built in `src/lib/domain/pix.ts`. Nobody notifies the app when it is paid, so the
order waits in `new`; staff check their bank app and record an "external Pix"
tender from the order page before accepting it.

## Local setup

Requirements: Node 22.12+, pnpm 10, Docker (for the local Supabase).

```sh
pnpm install
cp .env.example .env
pnpm exec supabase start          # applies supabase/migrations
pnpm exec supabase status         # copy API URL, anon key and service_role key into .env
pnpm seed                         # 4 staff accounts, sample menu, delivery zones, store open
pnpm dev                          # http://localhost:5173
pnpm worker                       # second terminal: background jobs
```

Seeded staff (password `burger123`, or `SEED_PASSWORD`): `dono@`, `gerente@`,
`caixa@`, `cozinha@burger.local` (owner, manager, cashier, kitchen).

To try online checkout locally set `PAYMENT_PROVIDER=local_stub`. The payment
page then shows a "simulate approved payment" button that sends a signed webhook,
just like a PSP would. The stub is refused when `NODE_ENV=production`.

## Environment variables

See [`.env.example`](.env.example). The web app and the worker read the same
variables.

| Variable                                                                                         | Required                                    | Purpose                                                                                            |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                                   | yes                                         | Session or direct Postgres connection, not the transaction pooler (pg-boss needs session features) |
| `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`                                                | yes                                         | Staff login and Realtime                                                                           |
| `SUPABASE_SERVICE_ROLE_KEY`                                                                      | for seed and "add staff"                    | Server only                                                                                        |
| `SHOP_NAME`, `SHOP_TIMEZONE`                                                                     | no                                          | Defaults: Deku Burger, America/Sao_Paulo                                                           |
| `ORIGIN`                                                                                         | build time, only when not served over https | CSRF origin                                                                                        |
| `APP_SECRET`                                                                                     | to save the iFood secret in the app         | Encrypts secrets saved in the database; generated by `deploy/setup.sh`                             |
| `BODY_SIZE_LIMIT`                                                                                | no                                          | Upload limit; the deploy sets `6M` for menu photos                                                 |
| `PAYMENT_PROVIDER`                                                                               | no                                          | `none` (default) or `local_stub` (dev only)                                                        |
| `IFOOD_ENABLED`, `IFOOD_CLIENT_ID`, `IFOOD_CLIENT_SECRET`, `IFOOD_MERCHANT_ID`, `IFOOD_API_BASE` | no                                          | Fallback when no iFood credentials are saved in the setup wizard                                   |
| `TEST_DATABASE_URL`                                                                              | tests                                       | Database that integration tests drop and recreate                                                  |

## Migrations

- **Your server:** the `shop-migrate` service applies new migrations every time
  the stack starts (`deploy/shop.sh up -d`).
- **Local Supabase:** `supabase start` applies them, and
  `pnpm exec supabase migration up --local` applies new ones.
- **Plain Postgres** (CI, tests): `pnpm migrate` first applies `db/plain-postgres-shim.sql`
  (a stand-in for Supabase's auth schema and roles). Never run it against Supabase.

New migrations go in `supabase/migrations/<timestamp>_<name>.sql`. Migrations
only add things. Never edit a migration that has already been applied.

## Tests

```sh
pnpm check                 # types and Svelte
pnpm lint                  # prettier + eslint
pnpm test                  # unit tests (domain rules, iFood mapping)
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/burger_test \
  pnpm test:integration    # orders, tenders, payments, webhooks, iFood, analytics
pnpm test:e2e              # Playwright; needs dev server + worker + seeded Supabase,
                           # PAYMENT_PROVIDER=local_stub for the web checkout test
```

In a container without browser downloads, set `PW_CHROMIUM_PATH` to a Chromium
binary. CI (`.github/workflows/ci.yml`) runs all of the above. The E2E job runs
against a local Supabase.

## Deploy

The shop runs on its own machine: see **[deploy/README.md](deploy/README.md)**
for the requirements, the three-command install, HTTPS (open ports or a free
Cloudflare Tunnel), updates and backups. The step-by-step launch checklist is in
[docs/go-live.md](docs/go-live.md).

One Docker image runs either process:

- web: `node build` (port 3000; `/health/live`, `/health/ready`)
- worker: `node --import tsx scripts/worker.ts` (one is enough; iFood polling is guarded by an advisory lock)

## Backup and restore

Everything that matters is in the database, the Storage volume (menu photos) and
`deploy/supabase/.env` (keys, including `APP_SECRET`). The nightly `pg_dump`,
off-machine copies and the restore drill are described in
[deploy/README.md](deploy/README.md#backups). pg-boss state lives in the
`pgboss` schema of the same database and is restored with it.

## Known gates

These are deliberate. Nothing below is claimed to work in production yet.

1. **No payment provider (PSP).** Web customers pay on pickup/delivery or by
   Pix to the shop's key, which staff confirm by hand. Automatic online payment
   (Pix with automatic confirmation, card) needs a PSP account (Mercado Pago,
   Pagar.me, Asaas…) and an implementation of `PaymentProvider`
   (`src/lib/server/payments/provider.ts`): create the checkout, check its
   status, verify the webhook on raw bytes, parse it, and refund. `local_stub`
   only simulates this in development.
2. **iFood: optional, unverified.** The adapter covers OAuth, polling with
   persist-before-ack, a signed webhook, order mapping, status sync and replay.
   It was written from iFood's public docs (`src/lib/server/integrations/ifood/api.ts`
   keeps every path in one place) and has never talked to iFood. The owner enters
   the credentials in the setup wizard, which tests the connection and explains
   errors; turning it on needs a passing test and an explicit acknowledgement that
   it is not homologated. Without it, staff key iFood orders in the POS as
   **"iFood (manual)"**. The connection test's error explanations are inferred
   from HTTP status codes.
3. **Menu photos need Storage.** Uploads use the self-hosted Supabase Storage
   service. Without `SUPABASE_SERVICE_ROLE_KEY` the editor works but refuses photos.
4. **Notifications and printing.** The `order-placed` job is the hook for
   WhatsApp/e-mail messages and an optional print agent. Neither is connected.
5. **Fiscal documents (NFC-e/SAT)** are out of scope. Use the shop's existing
   fiscal solution.

## Analytics definitions

Defined in `METRIC_DEFINITIONS` (`src/lib/server/analytics/queries.ts`) and shown
in the dashboard glossary. In summary:

- **Pedidos:** created in the period, by local creation date. Test orders are excluded.
- **Vendas brutas:** items + delivery fee of orders that were not cancelled or rejected, before discounts.
- **Líquido:** gross − discounts − confirmed refunds. This is an operational figure, not accounting revenue.
- **Recebido:** tenders confirmed in the period, by confirmation date. iFood-collected payments are shown separately.
- **Ticket médio:** (gross − discounts) of completed orders ÷ completed orders.
- **Tempo de preparo:** confirmed → ready, shown as median and p90 with the sample size.
- **No prazo:** ready at or before the promised time ÷ completed orders that have both times.
