# Deku Burger platform

Ordering and operations for one burger shop in Brazil: counter POS, web ordering
with pickup and delivery, kitchen display (KDS), iFood channel, payment
reconciliation and analytics. Staff screens and customer pages are pt-BR; money is
stored as integer centavos (BRL) and every "day" is a day in `America/Sao_Paulo`.

> **Status.** Counter, web ordering, KDS, settings, reconciliation and analytics
> work end to end against Supabase. **Online payment is a stub** (no PSP is
> connected) and **iFood is off** (written from the public docs, not yet
> homologated). See [Known gates](#known-gates) before going live.

## What is in here

| Area                                        | Where                                                | Notes                                                        |
| ------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| Web app (SvelteKit 3, Svelte 5, Tailwind 4) | `src/routes`                                         | `(shop)` customer site, `staff/` back office, `kitchen/` KDS |
| Domain rules (pure, unit tested)            | `src/lib/domain`                                     | order states, pricing, money, phone, time                    |
| Server services                             | `src/lib/server`                                     | the only code that writes orders, tenders, settings          |
| Worker (pg-boss)                            | `scripts/worker.ts`, `src/lib/server/worker`         | payment events, checkout expiry, iFood polling and sync      |
| Schema                                      | `supabase/migrations`                                | Postgres + RLS; realtime publication on `orders`             |
| CMS bootstrap                               | `scripts/directus-bootstrap.ts`                      | Directus collections, read-only token, cache Flow            |
| Tests                                       | `src/**/*.spec.ts`, `tests/integration`, `tests/e2e` | unit, DB integration, Playwright                             |
| Deploy                                      | `Dockerfile`, `fly.toml`, `docker-compose.yml`       | one image runs web or worker                                 |

### How it fits together

- **Supabase** holds the database, staff login (Supabase Auth) and Realtime. The
  browser only ever gets the anon key; the service-role key stays on the server.
  Staff can read `orders` through RLS for live updates; all writes go through
  server actions.
- **Directus** owns the menu and editorial pages only. Prices are read from
  Directus on the server and re-checked at order time; the browser never sets a
  price. Live operations (pause, sold-out, delivery zones, fees, prep time) live in
  the app's own tables so they work even if the CMS is down. Without
  `DIRECTUS_URL` the built-in demo menu is used.
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

## Local setup

Requirements: Node 22.12+, pnpm 10, Docker (for local Supabase and Directus).

```sh
pnpm install
cp .env.example .env
pnpm exec supabase start          # applies supabase/migrations
pnpm exec supabase status         # copy API URL, anon key and service_role key into .env
pnpm seed                         # 4 staff accounts, delivery zones, store open
pnpm dev                          # http://localhost:5173
pnpm worker                       # second terminal: background jobs
```

Seeded staff (password `burger123`, or `SEED_PASSWORD`): `dono@`, `gerente@`,
`caixa@`, `cozinha@burger.local` (owner, manager, cashier, kitchen).

To try online checkout locally set `PAYMENT_PROVIDER=local_stub`. The payment
page then shows a "simulate approved payment" button that sends a signed webhook,
just like a PSP would. The stub is refused when `NODE_ENV=production`.

### Directus (optional locally)

```sh
docker run -d --name directus -p 8055:8055 \
  -e SECRET=dev -e ADMIN_EMAIL=admin@example.com -e ADMIN_PASSWORD=admin12345 \
  -e IMPORT_IP_DENY_LIST=169.254.169.254 directus/directus:11.12.0
DIRECTUS_URL=http://localhost:8055 DIRECTUS_ADMIN_EMAIL=admin@example.com \
  DIRECTUS_ADMIN_PASSWORD=admin12345 APP_URL=http://localhost:5173 \
  CMS_WEBHOOK_SECRET=change-me-at-least-16 pnpm cms:bootstrap --seed
```

The script prints a `DIRECTUS_TOKEN` for a read-only storefront user; put it and
`DIRECTUS_URL` in `.env`. `--seed` copies the demo menu into an empty Directus.
Editors then manage products in Directus. **Use each product's SKU as its
"external code" in the iFood menu**, so iFood orders map to the same products.

`IMPORT_IP_DENY_LIST` matters only when Directus calls an app on a private
address (localhost or a private network). By default Directus refuses those
calls, so the menu-cache Flow would fail.

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
| `DIRECTUS_URL`, `DIRECTUS_TOKEN`, `CMS_WEBHOOK_SECRET`                                           | no                                          | Menu from Directus; cache Flow secret                                                              |
| `PAYMENT_PROVIDER`                                                                               | no                                          | `none` (default) or `local_stub` (dev only)                                                        |
| `IFOOD_ENABLED`, `IFOOD_CLIENT_ID`, `IFOOD_CLIENT_SECRET`, `IFOOD_MERCHANT_ID`, `IFOOD_API_BASE` | no                                          | iFood channel, off by default                                                                      |
| `TEST_DATABASE_URL`                                                                              | tests                                       | Database that integration tests drop and recreate                                                  |

## Migrations

- **Supabase (staging and production):**
  `pnpm exec supabase link --project-ref <ref>` and then `pnpm exec supabase db push`.
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

One Docker image runs either process:

- web: `node build` (port 3000; `/health/live`, `/health/ready`)
- worker: `node --import tsx scripts/worker.ts` (exactly one, or more: polling is guarded by an advisory lock)

**Recommended: Fly.io in `gru` (São Paulo) with Supabase in `sa-east-1`.** See
[`fly.toml`](fly.toml) and the step-by-step [go-live guide](docs/go-live.md).
[`docker-compose.yml`](docker-compose.yml) runs web, worker and Directus on a
single VPS behind your TLS proxy.

`PUBLIC_SUPABASE_URL` must be passed as a build argument. It is used to allow a
plain-http local Supabase in the CSP, and the hosted `https://` URL is already
covered.

## Backup and restore

- **Database:** Supabase daily backups (Pro plan and up; enable PITR for the
  production project). Before every migration run `pnpm exec supabase db dump
-f backup.sql --data-only` as well, and keep a schema dump from `db dump` with
  no flags.
- **Restore drill:** create a new Supabase project, `supabase db push`, then
  `psql "$NEW_DATABASE_URL" -f backup.sql`, point a staging deploy at it, and check
  `/staff/reconciliation` for a known day.
- **Directus:** back up its database and the `uploads` volume (or the S3 bucket if you use one).
- **pg-boss** state lives in the `pgboss` schema of the same database and is restored with it.

## Known gates

These are deliberate. Nothing below is claimed to work in production yet.

1. **Online payments: stub only.** No PSP is integrated. Pick one
   (Mercado Pago, Pagar.me, Stripe BR, Asaas…) and implement
   `PaymentProvider` (`src/lib/server/payments/provider.ts`): create the
   checkout, check its status, verify the webhook on raw bytes, parse it, and
   refund. Then add it to `PAYMENT_PROVIDER`. Until then, web customers pay on
   pickup or delivery. That option can be turned off in Settings → Loja.
2. **iFood: off, unverified.** The adapter covers OAuth, polling with
   persist-before-ack, a signed webhook, order mapping, status sync and replay.
   It was written from iFood's public docs (`src/lib/server/integrations/ifood/api.ts`
   keeps every path in one place) and has never talked to iFood. It needs merchant
   API credentials and iFood homologation before `IFOOD_ENABLED=true`. Until then
   staff key iFood orders in the POS as **"iFood (manual)"**.
3. **Directus licence.** Directus is free under its BSL licence only for
   organisations under its revenue/funding threshold. Confirm eligibility, or
   buy a licence, before production use.
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
