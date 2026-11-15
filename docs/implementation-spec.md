# Deku Lib: implementation spec and build plan

15 Nov 2026 · for gabrielSanson/deku_lib · written against `main` at `5071c77`

This document turns the requirements list of 15 Nov 2026 (102 features: 43 built, 13 partial, 46 missing) into
work a coding agent can carry out without asking questions. It is meant to be pasted, whole, into one Claude Code
session together with the prompt in section 16. Every phase ends with `main` green and deployable, so the run can
stop at any phase boundary and be resumed later from the progress file.

**Markers used in this document**

- **[UNVERIFIED]** an outside fact (API shape, price, legal date) that was not confirmed from a primary source on
  15 Nov 2026. Build behind a switch and an adapter, with a local stub, and leave a `TODO(verify)` comment.
- **[DEFAULT]** an owner decision that was still open; the spec picks the recommended option so the build is not
  blocked. Each one is a setting or a small, isolated module, so it can be changed later.
- **[OWNER]** a step only the owner (or the accountant) can do. The code is built and tested without it.

---

## 0. How the run works

1. Work phase by phase in the order of section 4. Do not start a phase before the previous one is green.
2. Keep `docs/implementation-progress.md` in the repo: one line per item ID in this spec (`L1`, `F2`, `S1.4`…)
   with `todo`, `done <commit>` or `deferred: <reason>`. Update it in the same commit as the work. A later run reads
   it first and continues from the first item that is not done.
3. Before every push: `pnpm verify` (svelte-check, prettier + eslint, unit tests, database tests). For any phase
   that changes a screen, also run the browser tests (recipe in `CONTRIBUTING.md`).
4. One commit per item, message in plain English describing the user-visible change (repo style, e.g.
   "Unpaid Pix orders cancel themselves after 20 minutes").
5. If something in this spec contradicts the code, the code's existing invariants (section 1.3) win; note the
   conflict in the progress file and carry on with the closest safe reading.
6. Never call a real outside service from tests. Every outside service has a local stub that production refuses
   to start with (the pattern of `PAYMENT_PROVIDER=local_stub`).

---

## 1. Ground truth: the repo today

### 1.1 Stack

| Part         | What it is                                                                                                                                                                                                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web app      | SvelteKit 3 + Svelte 5 (runes) + Tailwind 4, `@sveltejs/adapter-node`, TypeScript 6                                                                                                                                                                        |
| Database     | Postgres 16 inside self-hosted Supabase (vendored `deploy/supabase`), accessed from the server with `postgres` (porsager) via `src/lib/server/db.ts` (`db()`, `Tx`, `Db`)                                                                                  |
| Auth         | Supabase Auth: staff (separate cookie on `/staff`, `/kitchen`) and optional customer accounts (e-mail code, Google). JWT verified with `getClaims` in `src/hooks.server.ts`                                                                                |
| Jobs         | pg-boss in schema `pgboss`; queues in `src/lib/server/jobs.ts` (`QUEUES`), enqueued inside the caller's transaction with `enqueue(tx, …)`; handlers in `src/lib/server/worker/handlers.ts` and `integrations/ifood/worker.ts`; process `scripts/worker.ts` |
| Live updates | Supabase Realtime on `orders` and `store_runtime_settings` as a hint; screens re-fetch, polling fallback (`src/lib/client/live.svelte.ts`)                                                                                                                 |
| Deploy       | `deploy/shop.sh` = vendored Supabase compose + `deploy/compose.shop.yml` (services `shop-migrate`, `shop-web`, `shop-worker`, Caddy); optional Cloudflare Tunnel `deploy/compose.tunnel.yml`                                                               |
| Tests        | Vitest projects `server` (unit, `*.spec.ts` next to code) and `integration` (`tests/integration/*.test.ts`, needs `TEST_DATABASE_URL`, DB recreated per run by `tests/integration/setup.ts`); Playwright `tests/e2e`                                       |
| CI           | `.github/workflows/ci.yml`: checks on every push to `main` (non-blocking), e2e nightly and on demand                                                                                                                                                       |

### 1.2 Layout

```
src/lib/domain/          pure rules + *.spec.ts (money, pricing, order-status, payment-rules, pix, nfce, cash, campaigns, hours…)
src/lib/server/          services; the only code that writes
  orders/service.ts      createOrder, transitionOrder, confirmIfPaid (the only place orders change)
  payments/              provider.ts (PaymentProvider interface), mercadopago.ts, local-stub.ts, online.ts, tenders.ts
  fiscal/                focusnfe.ts (NFC-e body), service.ts (issue/retry/cancel)
  integrations/ifood/    api, mapping, service (poll, events, outbound sync), settings, check, worker
  cash/ campaigns/ catalog/ analytics/ settings/ notifications/ presets/ auth/
  actions.ts errors.ts   attempt(), failText(), shopText(), DomainError(key, {code,status,vars})
  rate-limit.ts          in-memory limiter keyed by string
src/lib/texts/           every word on screen: catalog.ts (customer), staff-*.ts, server-errors.ts
src/lib/components/      atoms → molecules → organisms (TextField, SelectField, ChoiceButtons, GuardedForm, ConfirmedPost, Modal, Money…)
src/routes/(shop)/       storefront: /, /cardapio, /menu/[slug], /checkout, /checkout/payment/[token], /orders/[token], /conta…, /p/[slug]
src/routes/staff/(app)/  staff: /staff, pos, caixa, orders, menu, analytics, campaigns, reconciliation, settings/*, setup
src/routes/kitchen, /painel, /totem, /api/v1/…, /health/{live,ready}
supabase/migrations/     additive only; latest 20261023000004_more_images.sql
```

### 1.3 Invariants every change keeps

1. Money is integer centavos (`*_cents`). No floats stored. Percent rates are stored as basis points (`*_bps`,
   10000 = 100%) or as `numeric` only where a legal rate needs 4 decimals (IBS/CBS, see F1).
2. A business day is a São Paulo day (`src/lib/domain/time.ts`). After tenancy, the shop's `timezone`.
3. The browser never sets a price. The server re-prices every cart (`priceCart`) and re-checks every offer.
4. Orders change only through `orders/service.ts`, in one transaction that writes `order_status_history`,
   `audit_log` and enqueues jobs. Status changes are versioned (`version` column).
5. Owner rule (21 Oct 2026): every order is paid when placed; nothing reaches the kitchen unpaid
   (`payment-rules.ts`). Do not reintroduce pay on delivery.
6. Webhooks: verify the raw bytes, store once (`payment_events` / `channel_events`, unique provider event id),
   then process in the worker. Handlers are idempotent (pg-boss is at-least-once).
7. Migrations only add. Never edit an applied migration. New files start at `20261115000001_…`.
8. Every word on screen is a text-catalog key (rules in `CONTRIBUTING.md`, "Words on screen"). Server refusals
   are `err.*` keys via `DomainError` / `failText`. A test fails if a key is in two modules.
9. Screens use the component kit (table in `CONTRIBUTING.md`); never the browser's `confirm()`.
10. Secrets the owner types are encrypted with `APP_SECRET` (`src/lib/server/secrets.ts`).
11. UI language is Brazilian Portuguese. Code, comments and commit messages are English.

### 1.4 Schema summary (what exists)

Singletons with `id = 1`: `store_runtime_settings`, `store_profile`, `store_branding`, `ifood_settings`,
`fiscal_settings`, `menu_revision`, `web_push_keys`.
Business tables: `staff_users` (role `admin|attendant|kitchen`), `audit_log`, `delivery_rules`,
`product_availability_overrides`, `customers` (unique `phone_e164`, `auth_user_id`), `orders` (+ `order_items`,
`order_item_modifiers`, `order_addresses`, `order_status_history`), `tenders`, `payment_events`, `channel_events`,
`channel_outbound`, `integration_mappings`, `menu_categories`, `menu_products` (pk `sku`), `menu_modifier_groups`,
`menu_modifier_options` (pk `sku`), `menu_product_groups`, `menu_ingredients`, `menu_product_ingredients`,
`content_pages`, `ui_texts`, `store_hours`, `store_closures`, `campaigns`, `coupons`, `order_push_subscriptions`,
`cash_sessions`, `cash_movements`, `fiscal_documents`.
`orders.channel in ('counter','web','ifood')`; `source_mode in ('staff_pos','web','kiosk','ifood_api','ifood_manual')`;
`payment_plan in ('counter','online','on_fulfillment','channel','pix_key')`.
The app and worker connect as the `postgres` superuser (see `deploy/compose.shop.yml`), so RLS is not enforced
for server queries today.

---

## 2. Decisions this spec builds on

### 2.1 Owner rules (from project memory, binding)

| Rule                                                                                  | Consequence                                                                                      |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Supabase is self-hosted with docker-compose; no Fly.io, no third-party cloud database | Every new service is a container in `deploy/compose.shop.yml` or code in the existing app/worker |
| Prefer free / open-source                                                             | New dependencies must be MIT/BSD/Apache/ISC. Allowed new deps listed in 13.4                     |
| Platform works without iFood                                                          | Every iFood and Open Delivery path is behind a per-shop switch, off by default                   |
| Pix to the shop's own key with staff confirmation stays the default; PSP slot kept    | PSP adapters are optional per shop; `pix_key` flow never removed                                 |
| Portuguese UI                                                                         | All new copy in pt-BR via the text catalog                                                       |
| Every order paid when placed                                                          | No pay-on-delivery, no tabs (owner decision 23 Oct: table orders pay when ordering)              |
| Work goes straight to `main` after `pnpm verify`                                      | No pull requests unless the environment forbids pushing to `main`                                |

### 2.2 Open decisions resolved with defaults

| #   | Question                  | Default chosen                                                                                                                                                                                                                 | Where it can be changed      |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| D1  | Account linking           | **[DEFAULT]** Link guest orders by **verified e-mail only**; phone is a contact field and never links                                                                                                                          | `auth/customer.ts`           |
| D2  | Unpaid order timeouts     | **[DEFAULT]** Pix-key 20 min, totem "pagar no caixa" 15 min                                                                                                                                                                    | Settings → Loja (new fields) |
| D3  | Kitchen print duplication | **[DEFAULT]** Server print queue with one designated print station per shop (browser-based, no installed agent)                                                                                                                | S5.1                         |
| D4  | `/cart` page              | **[DEFAULT]** Keep (not in scope)                                                                                                                                                                                              | –                            |
| D5  | Tenancy model             | **[DEFAULT]** One database, `shop_id` on every business row, Postgres RLS via `set local role app_server` + `app.shop_id`; single-shop self-host keeps working                                                                 | S1                           |
| D6  | Shop addresses            | **[DEFAULT]** `<slug>.<PLATFORM_DOMAIN>` plus optional custom domain, Caddy on-demand TLS                                                                                                                                      | S1                           |
| D7  | Billing shops             | **[DEFAULT]** v1 = monthly Pix charge to the **platform's own key** (static BR Code, same code as `domain/pix.ts`), platform admin confirms; 30-day trial; 7-day grace; `BillingProvider` slot for an automatic provider later | S1                           |
| D8  | PSP for automatic Pix     | **[DEFAULT]** Keep Mercado Pago adapter (fix it) and add a BACEN Pix API adapter used for Efí; owner picks per shop                                                                                                            | S3                           |
| D9  | Alerts channel            | **[DEFAULT]** E-mail over SMTP (owner's own mailbox or any SMTP) + Web Push to staff devices (reuses `web-push`); WhatsApp alerts after S3                                                                                     | L6                           |
| D10 | Error tracking            | **[DEFAULT]** Own `error_events` table + platform console view; optional Sentry-protocol DSN (self-hosted GlitchTip) later                                                                                                     | S5                           |
| D11 | Off-site backups          | **[DEFAULT]** `rclone` (MIT) to any remote the owner configures (S3-compatible, Backblaze B2, Google Drive)                                                                                                                    | L5                           |
| D12 | iFood customer data       | iFood-only contacts can never receive marketing; consent must come from the shop's own channel                                                                                                                                 | S3                           |

---

## 3. Target architecture

```
                 ┌──────────── Caddy (TLS, on-demand certs for shop hosts) ────────────┐
 browser ───────▶│  /auth /rest /realtime /storage → Supabase api-gw                   │
                 │  everything else            → shop-web (SvelteKit, adapter-node)    │
                 └──────────────────────────────────────────────────────────────────────┘
 shop-web: hooks.server.ts resolves locals.shop from Host → withShop(shopId, tx => …) for every query
 shop-worker: pg-boss handlers; every job payload carries shopId; handler runs inside withShop
 shop-watchdog (new): loop every 60 s → heartbeats, backups, no-orders, iFood poll age → alerts (SMTP, Web Push)
 shop-backup (new): nightly pg_dump -Fc → /backups + rclone copy to off-site remote → backup_runs row
 Postgres: business tables with shop_id + RLS (role app_server, NOBYPASSRLS); pg-boss on postgres role
 Outside (all optional, per shop, stubbed in tests): Mercado Pago, BACEN Pix API PSP (Efí), Focus NFe,
   iFood Merchant API, Open Delivery (99Food, Keeta), WhatsApp Cloud API, SMTP
```

Module rule for every outside service: `src/lib/server/<area>/provider.ts` defines an interface,
`<vendor>.ts` implements it, `local-stub.ts` implements it for tests and dev, and a factory picks one per shop
from settings. Production refuses `local_stub` (see `config.ts`).

---

## 4. Phase plan

| Phase                       | Content                                                                                                                                                                                                                                             | Size (agent days) | Gate to pass before the next phase                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| **L** Launch fixes          | L1 rate limit behind proxy, L2 unpaid expiry, L3 safe account linking, L4 checkout uses account, L5 backups, L6 alerts                                                                                                                              | 1–2               | `pnpm verify` + e2e green; `docs/go-live.md` updated                                       |
| **F** Tax reform            | F1 IBS/CBS fields on NFC-e, F2 fiscal readiness (homologação checklist, rejection list)                                                                                                                                                             | 1–2               | Unit tests on IBS/CBS math; payload snapshot test; **must be on `main` before 1 Jan 2027** |
| **H** Hardening             | H1 Mercado Pago webhook fix, H2 modifier `kind`, H3 idempotency key with request hash, H4 repeat-order safety                                                                                                                                       | 1                 | green                                                                                      |
| **S1** Many shops + billing | tenancy, host routing, sign-up, platform console, billing, terms/DPA, menu import (CSV)                                                                                                                                                             | 5–7               | Isolation test green; Deku runs as shop #1; single-shop self-host still works              |
| **S2** Channels             | iFood single app + homologation mode, price per channel, menu & sold-out sync, iFood payout CSV, Open Delivery adapter (99Food, Keeta)                                                                                                              | 4–5               | Fixture-driven tests for every event type; all off by default                              |
| **S3** Own channel          | WhatsApp bot + status messages, automatic Pix PSP, customer list, loyalty/referral/birthday, consented marketing, iFood contacts separate, "meus dados" requests, ratings, scheduled orders, order-online links                                     | 5–6               | Consent tests; WhatsApp signature tests; scheduled-order tests                             |
| **S4** Profit view          | recipe cost (ficha técnica), stock + auto sold-out, fees per payment, profit per order/channel, expenses + simple P&L, daily summary                                                                                                                | 4–5               | Worked example of section 11 reproduced in an integration test                             |
| **S5** Running shops well   | server print queue, dynamic time estimate, courier dispatch, fee by distance, NFC-e contingency + monthly export, refunds from screen, permissions + manager PIN, shifts/time clock, owner 2FA, offline POS, error tracking, load test, help centre | 6–8               | Load test passes target; e2e for dispatch and offline POS                                  |

Phases L, F and H are the launch-critical path. If the run must stop early, stop after H.

---

## 5. Phase L: launch fixes

### L1. Per-customer rate limit behind the proxy

**Problem.** `getClientAddress()` returns Caddy's container IP, so checkout's limit (10 orders / 10 min,
`src/routes/(shop)/checkout/+page.server.ts`) applies to the whole shop.

**Change.**

- `deploy/compose.shop.yml`, `x-app.environment`: add `ADDRESS_HEADER: ${ADDRESS_HEADER:-X-Forwarded-For}` and
  `XFF_DEPTH: ${XFF_DEPTH:-1}` (adapter-node reads both).
- `deploy/compose.tunnel.yml`: override for the tunnel setup with `ADDRESS_HEADER: CF-Connecting-IP` and no
  `XFF_DEPTH`; in `deploy/Caddyfile` add `trusted_proxies static private_ranges` inside the `servers` global
  option so Caddy forwards the client address it received from cloudflared.
- `src/lib/server/rate-limit.ts`: add `clientKey(event)` that returns `getClientAddress()` and, when it is a
  private address in production, logs one warning per process (`rate limit sees a private address; set
ADDRESS_HEADER`). Use it in checkout, push subscription, login and webhook limiters.
- `deploy/README.md` and `docs/go-live.md`: one paragraph naming both settings.

**Acceptance.** Two requests with different `X-Forwarded-For` values behind Caddy are limited separately; the
12th order from one address in 10 minutes is refused with `checkout.error.tooMany`, another address still orders.

**Tests.** Unit: `clientKey` with headers. `tests/selfhost/setup-check.mjs`: assert the app env has
`ADDRESS_HEADER` set.

### L2. Unpaid Pix-key and totem orders expire

**Problem.** `pix_key` orders and totem `counter` orders that are never paid stay `new` forever and count against
`max_open_orders` (`createOrder` counts `status in ('new','confirmed','preparing')`).

**Migration `20261115000001_unpaid_expiry.sql`.**

```sql
alter table public.store_runtime_settings
  add column unpaid_pix_minutes integer not null default 20 check (unpaid_pix_minutes between 5 and 120),
  add column unpaid_counter_minutes integer not null default 15 check (unpaid_counter_minutes between 5 and 120);
create index orders_unpaid_new_idx on public.orders (created_at)
  where status = 'new' and payment_status <> 'paid';
```

**Server.**

- `src/lib/server/payments/online.ts`: add `expireUnpaidOrders(now = new Date())`:
  - selects `orders` where `status = 'new'`, `payment_status in ('pending','failed','unknown')`, `is_test = false`
    and either (`payment_plan = 'pix_key'` and `created_at < now - unpaid_pix_minutes`) or
    (`payment_plan = 'counter'` and `source_mode = 'kiosk'` and `created_at < now - unpaid_counter_minutes`),
    `limit 50`, `for update skip locked`;
  - for each: cancel pending tenders, `refreshPaymentStatus`, `transitionOrder({ to: 'cancelled', actor: SYSTEM,
reason: <text 'order.reason.unpaidExpired'> })` in one transaction. Staff POS counter orders
    (`source_mode = 'staff_pos'`) are never auto-cancelled.
- `handleStaleOrders` calls it after `expireUnpaidCheckouts` and returns the count.
- Capacity check in `createOrder` excludes unpaid orders older than their timeout (defensive, in case the worker
  is down): count `new` only when `payment_status = 'paid' or created_at > now() - interval '…'`.
- Customer payment page `/checkout/payment/[token]`: show the deadline ("Pague até 19:42") and, once cancelled,
  `checkout.payment.expired` with a "Fazer o pedido de novo" link that refills the cart (reuse `domain/reorder.ts`).
- Staff order board: cancelled-by-timeout orders show the reason in the timeline (already rendered from history).

**UI.** Configurações → Loja (`settings/store`): two number fields "Cancelar Pix não pago após (min)" and
"Cancelar pedido do totem não pago após (min)".

**Texts.** `order.reason.unpaidExpired` ("Pagamento não recebido a tempo"), `checkout.payment.deadline`,
`checkout.payment.expired`, `checkout.payment.reorder`, `settings.store.unpaidPix`, `settings.store.unpaidCounter`.

**Acceptance.** A `pix_key` order created 21 minutes ago and unpaid becomes `cancelled` within one worker tick with
the reason recorded; a paid one is untouched; a staff POS counter order is untouched; a cancelled order no longer
counts against the busy limit.

**Tests.** Integration `orders.test.ts`: the four cases above, using `now` injection; the capacity check.

### L3. Link guest orders to an account by verified e-mail only (D1)

**Change in `src/lib/server/auth/customer.ts` `ensureCustomer`.**

- Remove the phone-based takeover. New rule: if `user.email` is set **and** `user.email_confirmed_at` is set,
  find a guest row `where lower(email) = lower(user.email) and auth_user_id is null and deleted_at is null` and
  link it (set `auth_user_id`, keep existing name). Google sign-ins count as verified when Supabase marks the
  e-mail confirmed.
- Otherwise insert a new customer row. Its `phone_e164` is set only when no other row has that number (as today);
  if the number belongs to a guest row, the new account keeps the phone in a new column `contact_phone_e164` and
  `phone_e164` stays null. Never move orders between rows based on phone.
- Migration `20261115000002_customer_contact_phone.sql`: `alter table customers add column contact_phone_e164 text;`
  and `create index customers_email_idx on customers (lower(email)) where email is not null and deleted_at is null;`
- `/conta` shows the phone from `coalesce(phone_e164, contact_phone_e164)`.
- Audit: `customer.linked` with `{ via: 'email' }`.

**Acceptance.** A sign-up with an unverified e-mail never sees guest orders. A verified e-mail that matches a guest
row's e-mail sees that history. Typing someone else's phone at sign-up links nothing.

**Tests.** Integration (new `tests/integration/accounts.test.ts`): verified e-mail links; unverified does not;
phone match does not; two accounts cannot link the same guest row (row lock).

### L4. Orders from signed-in customers belong to their account

**Change.**

- `CreateOrderInput` gains `customerId?: string | null`. When set, `createOrder` uses it and does **not** upsert by
  phone; it updates `name` only if null, and fills `phone_e164` only if null and the number is free.
- Guest path: change the upsert to
  `on conflict (phone_e164) … do update set name = coalesce(customers.name, excluded.name),
marketing_consent_at = coalesce(excluded.marketing_consent_at, customers.marketing_consent_at)` so a guest
  typing a number never renames the existing record.
- Checkout `place` and `quote` pass `locals.customer?.id`; `quote` uses it for `findOffer` (first-order and
  per-customer limits) instead of `customerIdByPhone` when signed in.

**Acceptance.** A signed-in customer whose phone was refused at sign-up still sees every order in `/conta`. A guest
using a number already on file does not change that customer's name.

**Tests.** Integration in `orders.test.ts` and `campaigns.test.ts` (first-order-only coupon refused for a signed-in
customer with a past order even when they type a new phone).

### L5. Automatic off-site backups with a restore test

**New files.**

- `deploy/backup/backup.sh` (POSIX sh, runs in a `postgres:16-alpine` container with `rclone` installed):
  1. `pg_dump -h db -U postgres -Fc "$POSTGRES_DB" > /backups/shop-$(date -u +%Y%m%dT%H%MZ).dump`
  2. if `RCLONE_REMOTE` is set: `rclone copy /backups "$RCLONE_REMOTE" --max-age 26h` (config from
     `/config/rclone.conf`, mounted read-only from `deploy/backup/rclone.conf`, git-ignored)
  3. delete local dumps older than `BACKUP_KEEP_DAYS` (default 14)
  4. insert a row into `public.backup_runs` with size, duration, `offsite boolean`, `error text`.
- `deploy/backup/restore-test.sh`: restores the newest dump into a scratch database `restore_check`, runs
  `select count(*) from orders` and `select max(created_at) from orders`, writes the result to `backup_runs`
  (`kind = 'restore_test'`), drops the scratch DB. Runs weekly (Sunday 04:00 São Paulo).
- `deploy/compose.shop.yml`: service `shop-backup` (`image: postgres:16-alpine`, installs `rclone` with `apk add`,
  runs `crond -f` with `deploy/backup/crontab`: daily 03:30, weekly restore test). Volume `./backups:/backups`.
- Migration `20261115000003_backup_runs.sql`:

```sql
create table public.backup_runs (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('dump', 'restore_test')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean not null default false,
  bytes bigint,
  offsite boolean not null default false,
  detail jsonb not null default '{}'::jsonb,
  error text
);
alter table public.backup_runs enable row level security;
```

- Staff: Configurações → Sistema (new page `settings/system`, admin only) shows last dump, last off-site copy,
  last restore test, each green/red, plus the rclone setup steps in plain Portuguese.
- `docs/go-live.md` and `deploy/README.md`: replace the manual cron section with the new service and the
  `rclone config` steps. **[OWNER]** create the remote (e.g. a Backblaze B2 bucket or Google Drive folder).

**Acceptance.** With the service running, a dump appears daily, is copied off the machine when `RCLONE_REMOTE`
is set, old dumps are pruned, and the restore test writes `ok = true`. The system page turns red when the last
successful dump is older than 26 h.

**Tests.** `tests/selfhost/backup-check.mjs` (runs in the self-host CI job only): run `backup.sh` once against
the test stack and assert a `backup_runs` row with `ok = true`. Unit test for the "stale" rule
(`src/lib/domain/health.ts`, `backupStale(lastOk, now)`).

### L6. Alerts when the worker stops or orders stop arriving (D9)

**Migration `20261115000004_heartbeats_alerts.sql`.**

```sql
create table public.system_heartbeats (
  name text primary key,              -- 'worker', 'watchdog', 'ifood-poll'
  beat_at timestamptz not null default now(),
  detail jsonb not null default '{}'::jsonb
);
create table public.alert_settings (
  id smallint primary key default 1 check (id = 1),
  email_to text[] not null default '{}',
  push_enabled boolean not null default true,
  no_orders_enabled boolean not null default true,
  no_orders_minutes integer not null default 60 check (no_orders_minutes between 15 and 240),
  updated_at timestamptz not null default now()
);
insert into public.alert_settings (id) values (1);
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('worker_down','no_orders','ifood_poll','backup_stale','fiscal_errors','disk')),
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  last_notified_at timestamptz,
  detail jsonb not null default '{}'::jsonb
);
create unique index alerts_one_open_idx on public.alerts (kind) where resolved_at is null;
create table public.staff_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff_users (id) on delete cascade,
  endpoint text not null check (endpoint like 'https://%'),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (staff_id, endpoint)
);
alter table public.system_heartbeats enable row level security;
alter table public.alert_settings enable row level security;
alter table public.alerts enable row level security;
alter table public.staff_push_subscriptions enable row level security;
```

**Server.**

- Worker: `startWorker` schedules queue `heartbeat` every minute; handler upserts `system_heartbeats('worker')`.
  The iFood poll tick upserts `ifood-poll` on success.
- `src/lib/domain/health.ts` (pure, unit-tested): `workerDown(beatAt, now)` (> 3 min), `ifoodPollStale(lastOk,
now, enabled)` (> 5 min while enabled and store open), `noOrdersSuspicious({ openNow, minutesSinceLastOrder,
expectedPerHour, thresholdMinutes })` → true when the store is open, accepting orders, `expectedPerHour >= 2`
  (average of the same weekday and hour over the last 4 weeks, computed by a query) and nothing arrived for
  `no_orders_minutes`.
- `src/lib/server/alerts/service.ts`: `evaluateAlerts(now)` opens/resolves rows in `alerts` (one open row per kind)
  and calls `notify(alert)` on open and every 30 min while open, plus once on resolve.
- `src/lib/server/alerts/notify.ts`: e-mail with `nodemailer` (env `SMTP_URL`, `ALERT_FROM`), Web Push to every
  `staff_push_subscriptions` row of admins (reuse `notifications/push.ts` VAPID keys). Copy is catalog text
  (`alert.workerDown.title`, …) read with `getTexts()`.
- `scripts/watchdog.ts` + compose service `shop-watchdog` (same image, `command: node --import tsx
scripts/watchdog.ts`): loop every 60 s → `evaluateAlerts`, upsert `system_heartbeats('watchdog')`. It runs apart
  from the worker so a dead worker is still reported.
- `/health/ready` adds `worker: { ok, beatAt }` (does not fail readiness, only reports).
- Staff: Configurações → Sistema gains "Alertas": e-mails to notify, a "Receber alertas neste aparelho" button
  (subscribes staff push), toggle and minutes for "sem pedidos", "Enviar alerta de teste".
- Staff home (`/staff`) shows open alerts in `UrgentAlertStrip`.

**Acceptance.** Stopping the worker container raises a "worker parado" e-mail and push within 4 minutes and a
"voltou a funcionar" message after restart. During opening hours with normal history, 60 minutes without orders
raises one alert; outside hours, nothing. Alerts do not repeat more than every 30 minutes.

**Tests.** Unit for every function in `domain/health.ts`. Integration `alerts.test.ts`: open/resolve logic and
de-duplication with a fake notifier.

---

## 6. Phase F: tax reform fields (IBS and CBS) on NFC-e

**Why now.** IBS/CBS fields are mandatory on NFC-e for companies outside Simples Nacional since 3 Aug 2026 and,
per the requirements doc, from 1 Jan 2027 for Simples Nacional, which covers most small burger shops. Focus NFe's
guide says sending them in 2026 is optional for Simples Nacional. **[UNVERIFIED]** the exact 2027 obligation and
the 2027 CBS rate ("ainda será fixada" in Focus's guide); the accountant confirms before production.

### F1. IBS/CBS on every NFC-e line

**Facts used** (Focus NFe field reference, read 15 Nov 2026; the item-level names come from the reference, the
totals names only from a guide example, so totals are **[UNVERIFIED]**):

| NT 2025.002 tag       | Focus field (item)                                                                 | Meaning                          |
| --------------------- | ---------------------------------------------------------------------------------- | -------------------------------- |
| `CST` (IBS/CBS)       | `ibs_cbs_situacao_tributaria`                                                      | 3-digit CST, required            |
| `cClassTrib`          | `ibs_cbs_classificacao_tributaria`                                                 | 6-digit classification, required |
| `vBC`                 | `ibs_cbs_base_calculo`                                                             | base                             |
| `pIBSUF` / `vIBSUF`   | `ibs_uf_aliquota` / `ibs_uf_valor`                                                 | state IBS                        |
| `pIBSMun` / `vIBSMun` | `ibs_mun_aliquota` / `ibs_mun_valor`                                               | municipal IBS                    |
| `vIBS`                | `ibs_valor_total`                                                                  | IBS on the line                  |
| `pCBS` / `vCBS`       | `cbs_aliquota` / `cbs_valor`                                                       | CBS                              |
| totals                | `ibs_cbs_base_calculo`, `ibs_uf_valor_total`, `ibs_valor_total`, `cbs_valor_total` | **[UNVERIFIED]**                 |

Focus does not calculate IBS/CBS for us; we compute and send them.
2026 test rates per Focus's guide: CBS 0.9%, IBS 0.1% (state 0.1%, municipal 0%). 2027–2028: IBS 0.05% state +
0.05% municipal; CBS to be fixed **[UNVERIFIED]**.

**Migration `20261115000005_ibs_cbs.sql`.**

```sql
alter table public.fiscal_settings
  add column crt text not null default '1' check (crt in ('1', '2', '3', '4')),  -- 1 Simples, 2 excesso, 3 normal, 4 MEI
  add column ibs_cbs_enabled boolean not null default false,
  add column ibs_cbs_cst text not null default '000' check (ibs_cbs_cst ~ '^\d{3}$'),
  add column ibs_cbs_class text not null default '000001' check (ibs_cbs_class ~ '^\d{6}$');
-- Rates by calendar year, editable by the owner/accountant; the defaults are the published test rates.
create table public.ibs_cbs_rates (
  year smallint primary key check (year between 2026 and 2040),
  cbs_rate numeric(7,4) not null check (cbs_rate >= 0),       -- percent, e.g. 0.9000
  ibs_uf_rate numeric(7,4) not null check (ibs_uf_rate >= 0),
  ibs_mun_rate numeric(7,4) not null check (ibs_mun_rate >= 0),
  note text,
  updated_at timestamptz not null default now()
);
insert into public.ibs_cbs_rates (year, cbs_rate, ibs_uf_rate, ibs_mun_rate, note) values
  (2026, 0.9000, 0.1000, 0.0000, 'Taxas de teste publicadas para 2026'),
  (2027, 0.9000, 0.0500, 0.0500, 'CBS de 2027 a confirmar com o contador');
alter table public.menu_products
  add column ibs_cbs_cst text check (ibs_cbs_cst is null or ibs_cbs_cst ~ '^\d{3}$'),
  add column ibs_cbs_class text check (ibs_cbs_class is null or ibs_cbs_class ~ '^\d{6}$');
alter table public.fiscal_documents add column ibs_cbs jsonb;   -- what was sent, for the accountant
alter table public.ibs_cbs_rates enable row level security;
```

(The 2027 CBS row is a placeholder flagged in the UI; issuing in 2027 shows a warning on the fiscal page until the
owner confirms the 2027 row, recorded as `note` changed + `updated_at` after 1 Dec 2026.)

**Domain (`src/lib/domain/nfce.ts`).**

- `ibsCbsLine(line: NfceLine, rates: {cbs, ibsUf, ibsMun} (strings with 4 decimals), cst, cls)` →
  `{ base_cents, ibs_uf_cents, ibs_mun_cents, ibs_cents, cbs_cents }` where
  `base = grossCents - discountCents + otherCents` **[UNVERIFIED: confirm base composition against the SVRS
  validator; keep it in one function]**, each value = `round_half_even(base * rate / 100)` computed with integer
  math on rate × 10000 (no floats).
- `ibsCbsTotals(lines)` sums them.
- `NfceLine` gains optional `ibsCbsCst` / `ibsCbsClass` (from the product, else the shop default).

**Provider (`src/lib/server/fiscal/focusnfe.ts`).** `NfceRequest` gains `ibsCbs?: { enabled, cst, cls, rates }`.
When enabled, each item gets the Focus fields above (`cents()` formatting, rates as `"0.9000"`), and the body gets
the totals fields. Field names live in one const map `FOCUS_IBS_CBS_FIELDS` with a `TODO(verify)` comment.

**Service (`fiscal/service.ts`).** Reads `fiscal_settings`, the `ibs_cbs_rates` row for the issue year (São Paulo
year); if `ibs_cbs_enabled` and no row exists for that year → `DomainError('err.fiscal.noRates')`, the job fails
visibly (no silent issue). Stores what was sent in `fiscal_documents.ibs_cbs`.

**UI.** Configurações → Nota fiscal gains a section "Reforma tributária (IBS e CBS)": regime (CRT) select,
switch "Enviar IBS e CBS nas notas", CST and cClassTrib defaults with help text "Confirme com seu contador",
an editable table of rates per year, and a banner from 1 Dec 2026 until the 2027 row is confirmed. Product
editor: two optional fields under "Fiscal" (CST IBS/CBS, cClassTrib).

**Acceptance.** With the switch on, a R$45.00 order with R$5.00 delivery and R$4.50 discount produces item fields
whose sums equal the totals, the note total still equals the order total, and the payload snapshot matches.
With the switch off, the payload is byte-identical to today's (snapshot).

**Tests.** Unit `nfce.spec.ts`: rounding, discount spread, multi-line sums, year switch. Unit
`focusnfe.spec.ts` (new): payload snapshots on/off. Integration `fiscal.test.ts`: missing-year error; stored
`ibs_cbs` json.

### F2. Fiscal readiness for go-live

- `fiscal/service.ts`: `fiscalReadiness()` returns a checklist: CNPJ set, token saved, environment, NCM default,
  CRT set, IBS/CBS decision made, last homologação note authorized (from `fiscal_documents`).
- Configurações → Nota fiscal shows the checklist with green ticks and a "Emitir nota de teste" button that issues a
  R$1.00 note in homologação for a synthetic test order (`is_test = true`, never in reports).
- A list "Notas com erro" (`fiscal_documents.status in ('rejected','error')`, last 30 days) with the provider's
  message and "Tentar de novo" (existing `retryFiscal`).
- Alert kind `fiscal_errors` (from L6) opens when 3+ notes fail in an hour.
- `docs/nota-fiscal.md`: add the IBS/CBS section and the SVRS validator link
  (`https://dfe-portal.svrs.rs.gov.br/Cff/ValidadorRtcNfe`) for the accountant.

**Acceptance.** A new shop sees exactly what is missing before turning on NFC-e; a test note can be issued from the
screen in homologação.

---

## 7. Phase H: hardening carried over from the October review

### H1. Mercado Pago webhook signature

`src/lib/server/payments/mercadopago.ts`: accept `ts` in seconds or milliseconds (10 digits → ×1000), build the
manifest from the `data.id` **query parameter** when present (fallback to body), lower-case the id when it is
alphanumeric, keep the 5-minute replay window. **[UNVERIFIED]** confirm with one sandbox payment; the go-live doc
already lists it. Tests: extend `mercadopago.spec.ts` with both `ts` units and the query-param manifest.

### H2. Modifier kind instead of the "Sem " prefix

Migration `20261115000006_modifier_kind.sql`:
`alter table order_item_modifiers add column kind text not null default 'add' check (kind in ('add','remove'));`
plus a backfill `update … set kind = 'remove' where option_sku is null and option_name like 'Sem %'`.
`priceCart` sets `kind: 'remove'` for removed ingredients; `OrderCard.svelte`, `staff/print/[id]`,
`domain/reorder.ts`, `pos/ProductSheet.svelte` and `menu/[slug]` use `kind`. The ticket still prints "Sem {name}"
from the catalog key `ticket.removed`. Tests: `reorder.spec.ts`, `pricing.spec.ts`, an option named "Sem glúten"
stays an add-on.

### H3. Idempotency key reused with a different request

Migration `20261115000007_request_hash.sql`: `alter table orders add column request_hash text;`
`createOrder` computes `sha256(JSON of {channel, sourceMode, lines, fulfillmentType, address, couponCode,
customer phone/email})` (stable key order, `src/lib/domain/request-hash.ts`). `findByIdempotencyKey` compares; on
mismatch throw `DomainError('err.order.keyReused', { code: 'key_reused', status: 409 })`. The checkout client
generates a new key when the cart changes. Tests: same key + same cart returns the order; different cart → 409.

### H4. Repeat-order safety on the client

`src/lib/client/cart.svelte.ts`: the idempotency key is regenerated on any cart, fulfillment or address change and
kept only across retries of the same payload. Unit-test the key rotation.

---

## 8. Stage S1: many shops on one system, sign-up and billing

Goal: one hosted install serves many shops; Postgres guarantees no shop sees another's rows; a shop owner signs
up and sells the same day; the platform charges a monthly fee. A private single-shop install keeps working with
no extra steps.

### S1.1 Tenancy core

**Migration `20261115000101_shops.sql`.**

```sql
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  name text not null check (length(name) between 1 and 80),
  business_type text not null default 'lanchonete',
  preset text not null default 'blank',
  timezone text not null default 'America/Sao_Paulo',
  status text not null default 'trial' check (status in ('trial','active','past_due','suspended','closed')),
  plan text not null default 'essencial',
  trial_ends_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.shop_domains (
  host text primary key check (host = lower(host)),
  shop_id uuid not null references public.shops (id) on delete cascade,
  kind text not null check (kind in ('platform','custom')),
  verified_at timestamptz
);
create table public.shop_members (
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('admin','attendant','kitchen')),
  display_name text not null,
  active boolean not null default true,
  pin_hash text,
  created_at timestamptz not null default now(),
  primary key (shop_id, user_id)
);
create table public.shop_counters (
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null,
  value bigint not null,
  primary key (shop_id, name)
);
create table public.shop_secrets (
  shop_id uuid not null references public.shops (id) on delete cascade,
  kind text not null,              -- 'mercadopago_token','mercadopago_webhook','ifood','focusnfe_token','whatsapp','psp_pix_cert'…
  ciphertext text not null,
  updated_at timestamptz not null default now(),
  primary key (shop_id, kind)
);
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
-- Default shop for existing installs; its id is stable so self-hosted single shops keep working.
insert into public.shops (id, slug, name, status)
  values ('00000000-0000-4000-8000-000000000001', 'loja', coalesce((select display_name from store_profile where id = 1), 'Minha loja'), 'active');
```

**Migration `20261115000102_shop_id_everywhere.sql`.** For every business table in 1.4 (all except `audit_log`
gets it too, `payment_events`/`channel_events` get it nullable until routed):

1. `add column shop_id uuid not null default '00000000-0000-4000-8000-000000000001' references shops(id)`, then
   `alter column shop_id drop default` (the app always sets it).
2. Singletons: drop the `id = 1` check and primary key, make `shop_id` the primary key.
3. Text natural keys become per shop: `menu_categories (shop_id, id)`, `menu_products (shop_id, sku)` and
   `(shop_id, slug)`, `menu_modifier_groups (shop_id, id)`, `menu_modifier_options (shop_id, sku)`,
   `menu_ingredients (shop_id, id)`, `content_pages (shop_id, slug)`, `ui_texts (shop_id, key)`,
   `product_availability_overrides (shop_id, sku, channel)`, `store_closures (shop_id, day)`; rewrite the foreign
   keys between them as composite keys `(shop_id, …)` with the same `on update cascade / on delete` behaviour.
4. Global uniques become per shop: `orders (shop_id, order_number)`, `orders (shop_id, channel, channel_order_id)`,
   `orders (shop_id, idempotency_key)`, `coupons (shop_id, code)`, `customers (shop_id, phone_e164)` partial,
   `customers (shop_id, auth_user_id)`, `delivery_rules (shop_id, match_kind, match_value)`,
   `integration_mappings` uniques, `cash_sessions` one-open index `(shop_id) where status = 'open'`,
   `tenders (shop_id, idempotency_key)`.
5. `staff_users` rows are copied into `shop_members` for the default shop; `staff_users` stays (read-only, kept
   for history foreign keys) and `loadStaff` moves to `shop_members`.
6. Order numbers: `shop_counters('order_number')` seeded from `max(order_number)`; `createOrder` takes the next
   value with `update shop_counters set value = value + 1 where shop_id = $1 and name = 'order_number' returning
value` inside the order transaction. The old sequence default is dropped.
7. Indexes: every existing index gets `shop_id` as its first column.

Write this migration as a generated, reviewed SQL file (a script `scripts/gen-tenancy-sql.ts` may help produce
it, but the committed artefact is plain SQL).

**Migration `20261115000103_rls.sql`.**

```sql
create role app_server nologin nobypassrls;
grant usage on schema public to app_server;
grant select, insert, update, delete on all tables in schema public to app_server;
grant usage, select on all sequences in schema public to app_server;
alter default privileges in schema public grant select, insert, update, delete on tables to app_server;
create or replace function public.current_shop_id() returns uuid
language sql stable as $$ select nullif(current_setting('app.shop_id', true), '')::uuid $$;
-- For each business table T:
--   create policy T_shop on public.T for all to app_server
--     using (shop_id = public.current_shop_id()) with check (shop_id = public.current_shop_id());
-- Platform tables (shops, shop_domains, platform_admins) get no app_server policy: only platform code
-- running as postgres reads them.
-- Realtime (authenticated role):
drop policy orders_staff_read on public.orders;
create policy orders_member_read on public.orders for select to authenticated using (
  exists (select 1 from public.shop_members m where m.user_id = auth.uid() and m.shop_id = orders.shop_id and m.active));
-- same for store_runtime_settings.
```

**Server.**

- `src/lib/server/db.ts`: `withShop<T>(shopId, fn: (tx: Tx) => Promise<T>)` →
  `db().begin(async tx => { await tx\`select set_config('app.shop_id', ${shopId}, true)\`; await tx\`set local role
  app_server\`; return fn(tx); })`. `platformDb()` returns the pool for platform code (no role switch).
- Every service function keeps its `(… , sql: Db = db())` style but call sites pass the `withShop` transaction.
  Route loads/actions get `locals.shop` and call `withShop(locals.shop.id, tx => service(tx, …))`. Where a service
  opens its own transaction today (`db().begin` in `createOrder`, cash, campaigns), it takes a `Tx` instead and
  nests with `tx.savepoint` when needed.
- ESLint rule (custom, `eslint.config.js` `no-restricted-syntax`): calling `db()` is refused outside
  `src/lib/server/db.ts`, `src/lib/server/platform/**`, `scripts/**` and tests.
- Jobs: every `enqueue` payload includes `shopId`; `startWorker` wraps each handler in `withShop(job.data.shopId, …)`.
  The stale-orders, heartbeat and iFood poll schedules fan out: one scheduled "tick" job enqueues one job per
  active shop (`singletonKey: '<queue>:<shopId>'`). iFood poll lock becomes `pg_try_advisory_lock(hashtext('ifood:'
|| shop_id))`.
- `config.ts`: `TENANCY` = `single` (default) or `multi`; `PLATFORM_DOMAIN` (e.g. `dekulib.com.br`) required when
  `multi`. In `single`, every request resolves to the default shop and the sign-up/platform routes return 404.
- Settings that were env vars become per-shop rows: `PAYMENT_PROVIDER` and MP keys → `payment_settings` (new
  singleton-per-shop table: `provider`, `methods text[]`) + `shop_secrets`; `IFOOD_*` → `ifood_settings` +
  `shop_secrets`; `SHOP_PRESET`/`SHOP_NAME` → `shops.preset`/`shops.name` (env stays as the seed default for the
  default shop). The env values are still honoured for the default shop in `single` mode so existing installs keep
  working without edits.
- Storage: menu photos under `media/<shop_id>/…`; `/media/menu/[file]` resolves through `locals.shop`. A migration
  script `scripts/move-media.ts` moves existing files into the default shop's folder.

**Acceptance.** All existing unit, integration and e2e tests pass against a two-shop seed. A transaction for shop
B cannot read, update or delete any row of shop A in any table (generic test below). The live Deku server
upgrades in place with no manual SQL.

**Tests.**

- `tests/integration/isolation.test.ts`: lists every table with a `shop_id` column from `information_schema`,
  inserts a row for shop A through the service layer (or a minimal valid row), then under `withShop(B)` asserts
  `select` returns 0 rows and `update`/`delete` affect 0 rows, and `insert` with `shop_id = A` fails the policy.
  The test fails if a new table has `shop_id` but no policy, or a business table lacks `shop_id`.
- `tests/integration/setup.ts` seeds two shops (Deku fixture menu in both, different prices).

### S1.2 Host routing

- `hooks.server.ts`: resolve `locals.shop` from `event.url.host` via `shop_domains` (60 s in-memory cache,
  invalidated on change). Unknown host in `multi` → platform landing page (`src/routes/(platform)/+page.svelte`).
  `locals.shop.status = 'suspended'` → storefront shows `shop.suspended` text and refuses orders; staff can sign
  in read-only.
- Staff sign in once on any host they belong to; `loadStaff` reads `shop_members` for `(locals.shop.id,
claims.sub)`. A user who is a member of several shops gets a picker at `/staff/lojas` that links to each shop's
  host.
- Payment and channel webhooks carry the shop: `/api/v1/payments/webhooks/[provider]/[shop]` and
  `/api/v1/integrations/ifood/webhook/[shop]`; the old paths keep working for the default shop.
- Caddy: in `multi`, a catch-all site `https://` with `on_demand_tls { ask http://shop-web:3000/api/v1/tls-ask }`;
  `/api/v1/tls-ask?domain=` returns 200 only for hosts in `shop_domains`. Document the wildcard DNS record
  **[OWNER]**.

### S1.3 Self sign-up (`/criar-loja`)

- Public form (rate-limited, hCaptcha not used; honeypot field + per-IP limit): owner name, e-mail, password (or
  Google), shop name, slug (live availability check), business type (`lanchonete`, `hamburgueria`, `pizzaria`,
  `acai`, `cafeteria`, `restaurante`), city, accept terms + DPA (checkbox, version recorded).
- `src/lib/server/platform/signup.ts` `createShop(input)` in one transaction (as postgres): insert `shops`
  (`status 'trial'`, `trial_ends_at = now() + 30 days`), `shop_domains` (`<slug>.<PLATFORM_DOMAIN>`), the
  per-shop singleton rows with preset defaults, `shop_members` (admin), `terms_acceptances`; then (outside the
  transaction) creates the Supabase user through the admin API (existing `auth/admin.ts`). On failure the shop is
  marked `closed` and the user is told to try again.
- After sign-up: redirect to `https://<slug>.<domain>/staff/setup` (existing wizard). The wizard gains an
  optional first step "Importar cardápio" (S1.6).
- Migration `20261115000104_terms.sql`: `terms_acceptances (shop_id, user_id, document text check (document in
('terms','dpa','privacy')), version text, accepted_at, ip)`; terms documents are Markdown files in
  `src/lib/platform/legal/` rendered at `/termos`, `/privacidade-plataforma`, `/dpa`. Their text is a draft marked
  "Revisar com advogado" **[OWNER]**.

### S1.4 Platform console (`/plataforma`)

- Only `platform_admins` (checked server side, separate cookie scope like staff). Screens: shops list (name,
  slug, status, plan, trial end, last order, orders last 7 days, open alerts), shop detail (members, domains,
  billing history, last 50 audit rows, job failures from `pgboss.job` with state `failed`), actions: suspend,
  reactivate, extend trial, mark invoice paid, "Ver como a loja" (read-only impersonation: sets a signed cookie
  `platform_view=<shop_id>`, every write refused, every view audited with actor type `platform`).
- `audit_log.actor_type` check gains `'platform'` (migration).
- `scripts/create-platform-admin.ts <email>`.

### S1.5 Billing shops (D7)

- Migration `20261115000105_billing.sql`: `plans (code pk, name, price_cents, limits jsonb)` seeded with
  `essencial` (R$99,90 placeholder **[OWNER]** sets price), `invoices (id, shop_id, period_start, period_end,
amount_cents, status check in ('open','paid','void'), due_at, paid_at, pix_payload text, method text, provider
text, provider_ref text)`, `platform_settings (id=1, pix_key, pix_merchant_name, pix_merchant_city,
grace_days default 7)`.
- `src/lib/server/platform/billing.ts`: monthly job (1st day 06:00 São Paulo) creates an open invoice per shop
  whose trial ended, with a static BR Code from the platform key (`domain/pix.ts` `buildPixPayload` with
  `txid = invoice id`), e-mails it to the shop admins, and shows it in Configurações → Plano. Daily job: invoices
  past `due_at + grace_days` set the shop to `past_due` (banner) and after 14 days `suspended`. Platform admin
  marks paid in the console; paying reactivates.
- `BillingProvider` interface (`createCharge`, `getStatus`, `parseWebhook`) with only `manual_pix` implemented;
  automatic Pix Automático / boleto / card via a PSP is a later adapter **[UNVERIFIED]**.
- Staff: Configurações → Plano e cobrança (admin): plan, status, next invoice, Pix QR + copia e cola, history.

### S1.6 Menu import

- CSV import at Cardápio → Importar: columns `categoria, nome, descricao, preco, adicionais` (documented
  template download), preview with errors per row, then `importCatalog` (existing `catalog/editor.ts`) in one
  transaction. Prices parsed with `parseBRL` in `domain/money.ts`.
- iFood menu import is part of S2.3 (needs the iFood link).

### S1.7 Presets per business type

`src/lib/server/presets/` gains `business-types.ts`: per type, starting texts overrides (no burger words in the
neutral defaults), category icons, starter catalog, which modes start on (delivery, pickup, dine-in, totem) and
suggested NCM. `shops.preset` keeps `blank`/`deku` looks. A unit test fails if a neutral default text names a
specific food.

**S1 gate.** Isolation test green; all suites green on a two-shop seed; `TENANCY=single` install upgraded from
`5071c77` data with no manual step (integration test: run all migrations on a DB seeded with pre-tenancy data,
then run the order flow).

---

## 9. Stage S2: channels (iFood properly, price per channel, Open Delivery)

Everything here is off by default per shop and works without credentials thanks to fixture-driven stubs.

### S2.1 Channel adapter interface

`src/lib/server/integrations/channel.ts`:

```ts
export interface ChannelAdapter {
	channel: 'ifood' | 'opendelivery_99food' | 'opendelivery_keeta';
	pollEvents?(shop: ShopRef): Promise<ChannelEvent[]>; // store, then ack
	verifyWebhook?(raw: Uint8Array, headers: Headers, shop: ShopRef): Promise<boolean>;
	ackEvents(shop: ShopRef, ids: string[]): Promise<void>;
	getOrder(shop: ShopRef, channelOrderId: string): Promise<ExternalOrder>;
	pushStatus(
		shop: ShopRef,
		order: OrderRef,
		to: 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'cancelled',
		reason?: string
	): Promise<void>;
	syncMenu?(shop: ShopRef, menu: ChannelMenu): Promise<SyncReport>;
	setAvailability?(
		shop: ShopRef,
		items: { externalId: string; available: boolean }[]
	): Promise<void>;
}
```

Refactor `integrations/ifood/service.ts` onto it without behaviour change (existing `ifood.test.ts` must pass
unchanged). `orders.channel` check gains `'opendelivery'` and a new column `channel_partner text` (`99food`,
`keeta`) for Open Delivery orders.

### S2.2 One iFood app for all shops **[UNVERIFIED]**

iFood's "distributed app" model lets a merchant authorize our single app with a user code instead of creating
developer credentials. The exact OAuth flow (userCode / authorizationCode grant, token refresh lifetimes) could not
be read on 15 Nov 2026 (developer portal did not load). Build:

- Platform-level env `IFOOD_APP_CLIENT_ID`, `IFOOD_APP_CLIENT_SECRET` (platform secret, not per shop).
- Configurações → iFood gains "Conectar com iFood": calls `requestUserCode()`, shows the code and the iFood link,
  polls `exchangeAuthorizationCode()` and stores the per-shop refresh token in `shop_secrets('ifood')`. The
  existing "own credentials" path stays as "Avançado".
- Both calls sit in `ifood/auth.ts` behind an interface with a stub; `TODO(verify)` on every endpoint path.
- Homologation mode: a per-shop flag `ifood_settings.homologation boolean`; when on, every request/response is
  stored in `channel_events`/`channel_outbound` with full payloads, and a screen "Roteiro de homologação" lists the
  iFood test cases (receive, confirm, start preparation, ready, dispatch, cancel by shop, cancel requested by
  customer) with a tick when the system has seen each one succeed. Cancellation waits for the `CANCELLED` event
  before showing the order as cancelled (requirements doc note).
- Setup reminder in the screen: turn off iFood's own auto-accept and auto-print in the iFood portal **[OWNER]**.

### S2.3 Price per channel and menu sync

- Migration: `menu_channel_prices (shop_id, sku, channel, price_cents, primary key (shop_id, sku, channel))` and
  same for options; `menu_products.ifood_markup_bps integer` as a shop-wide default in a new
  `channel_settings (shop_id pk, ifood_markup_bps default 0, round_to_cents default 90)`.
- `priceCart(catalog, lines, { channel })` uses the channel price when present, else
  `applyMarkup(price, markupBps, roundTo)` (pure, in `domain/pricing.ts`, unit-tested: R$29,90 + 15% rounded to
  ,90 → R$34,90). Site and counter prices are unaffected.
- Product editor: "Preço no iFood" field with the computed suggestion; a bulk screen Cardápio → Preços por canal.
- Menu sync job `ifood-menu-sync` (manual button + after menu changes, debounced 2 min): builds `ChannelMenu`
  from the catalog (names, descriptions, prices for the channel, photos as public URLs, availability), calls
  `syncMenu`, records a `SyncReport` (created, updated, failed with reasons) shown on Configurações → iFood.
  Sold-out toggles call `setAvailability` immediately (job `channel-availability`). **[UNVERIFIED]** iFood catalog
  API shapes: implement against the stub and keep the mapping in `ifood/catalog.ts`.
- iFood menu import (reverse): "Importar cardápio do iFood" reads the iFood catalog and fills an import preview
  (same screen as S1.6).

### S2.4 iFood payout check

No iFood financial API is assumed. Owner uploads iFood's financial statement CSV (Portal do Parceiro →
Financeiro) at Relatórios → Repasses iFood: parser in `src/lib/server/integrations/ifood/payout-csv.ts` maps
columns by header name (configurable map, because the exact export format is **[UNVERIFIED]**), matches rows to
orders by `channel_order_id`/`channel_display_id`, stores `channel_payouts (shop_id, channel, period, order_id
nullable, gross_cents, commission_cents, fee_cents, net_cents, raw jsonb)`, and shows: expected vs received,
orders missing from the statement, statement lines without an order. Commission and fees feed S4.

### S2.5 Open Delivery adapter (99Food, Keeta) **[UNVERIFIED]**

Open Delivery (Abrasel) is an open standard; 99Food and Keeta joined in Nov 2025. Implement
`integrations/opendelivery/` against the published Open Delivery spec version pinned in a constant
(`OD_SPEC_VERSION`), covering: merchant polling of events and acknowledgment, order details, confirm, ready for
pickup, dispatch, cancel (asynchronous: wait for the cancelled event), and webhook signature if the partner uses
webhooks. Per shop and per partner: base URL, client id/secret in `shop_secrets`, switch, connection test
(same `check.ts` pattern as iFood with Portuguese diagnostics). Orders arrive with `channel = 'opendelivery'`,
`channel_partner`, `payment_plan = 'channel'`, priced externally (`externalPricing`). Fixtures in
`tests/fixtures/opendelivery/` written from the spec's examples.

**Acceptance (S2).** With stubs: an iFood order and an Open Delivery order each appear on the board, move through
every status with the outbound call recorded, a cancel waits for the event, sold-out on the site toggles the item
on the channel, the menu sync report lists results, the payout CSV matches 100% of fixture orders.

**Tests.** `ifood.test.ts` (unchanged + new auth/sync cases), `opendelivery.test.ts`, `pricing.spec.ts` markup,
`payout-csv.spec.ts`.

---

## 10. Stage S3: the shop's own channel

### S3.1 WhatsApp ordering bot and status messages

Official WhatsApp Business Platform (Cloud API) only. Replies inside 24 h of the customer's last message and
utility messages in that window are free; marketing costs per message (Meta pricing page, read for the
requirements doc). **[UNVERIFIED]** Graph API version and template approval rules; keep the version in one constant.

- Per shop: `whatsapp_settings (shop_id pk, enabled, phone_number_id, waba_id, display_phone, verify_token,
templates jsonb)`; access token and app secret in `shop_secrets`.
- Webhook `GET/POST /api/v1/whatsapp/[shop]`: GET answers the `hub.challenge` when `hub.verify_token` matches;
  POST verifies `X-Hub-Signature-256` (HMAC-SHA256 of raw body with the app secret, timing-safe), stores in
  `channel_events` (channel `whatsapp`), worker processes.
- Bot (state machine in `src/lib/domain/whatsapp-bot.ts`, pure, unit-tested): any first message → greeting with
  shop name, open/closed state and the menu link `https://<host>/cardapio?wa=<token>` (token links the WhatsApp
  number to the checkout so the phone is prefilled and verified-by-possession for that order only); "status" /
  "meu pedido" → last order status; "falar com atendente" → flags the conversation for staff (staff see a badge
  and reply from their phone's WhatsApp Business app; no in-app inbox in v1).
- Status messages (utility templates `pedido_recebido`, `pedido_pronto`, `saiu_para_entrega`, `pedido_cancelado`)
  sent by job `whatsapp-send` from `order-placed`, ready and cancel transitions when the customer opted in for
  order updates at checkout (`customers.whatsapp_updates_at`) or wrote to the shop in the last 24 h.
- `message_outbox (id, shop_id, channel ('whatsapp','email'), to_address, template, vars jsonb, status, attempts,
provider_ref, error, created_at, sent_at)`; provider interface `MessagingProvider` with `whatsapp-cloud.ts`,
  `smtp.ts` and `local-stub.ts`.
- Configurações → WhatsApp: setup steps in Portuguese, fields, "Enviar mensagem de teste", template status.

### S3.2 Automatic Pix through a PSP (D8)

- Make the provider per shop (`payment_settings.provider` from S1). Keep `mercadopago` (fixed in H1).
- New `payments/pix-bacen.ts`: the BACEN Pix API standard (`PUT /v2/cob/{txid}` to create a charge with
  `calendario.expiracao`, `GET /v2/cob/{txid}`, webhook registration `PUT /v2/webhook/{chave}`, refunds
  `PUT /v2/pix/{e2eid}/devolucao/{id}`), OAuth2 client credentials with mTLS (PSP certificate uploaded by the owner,
  stored encrypted in `shop_secrets('psp_pix_cert')`). Configured for Efí as `provider = 'efi'` with its base
  URLs. **[UNVERIFIED]** Efí base URLs, webhook mTLS/`?ignorar=` details and fee (1.19% per the requirements doc).
- Checkout keeps `pix_key` as a choice the owner can turn off once a PSP is on; the payment page shows the dynamic
  QR and confirms automatically.

### S3.3 Customer list and LGPD separation (D12)

- Migration: `customers` gains `source text not null default 'own' check (source in ('own','ifood','opendelivery',
'whatsapp','pos'))`, `first_order_at`, `last_order_at`, `orders_count`, `total_spent_cents` (maintained by
  `createOrder`/cancel in the same transaction), `whatsapp_updates_at`, `birthday date`, `marketing_opt_out_at`.
  Channel orders create/link customers with `source = channel`; their `marketing_consent_at` is never set by a
  channel order.
- `src/lib/domain/consent.ts`: `mayMarket(customer)` = consent on an own channel and not opted out;
  iFood/Open Delivery-only contacts are always false. Unit-tested.
- Staff: Clientes (`/staff/clientes`, admin): list with search, filters (sem pedir há 30 dias, frequentes, novos,
  origem), columns orders / total / last order / consent badge; detail page with orders. CSV export excludes
  contacts that may not be marketed to unless the export is "for delivery only" (no phone column then).

### S3.4 Loyalty, referral, birthday

Builds on `campaigns` + `coupons` (kinds `loyalty`, `referral_welcome`, `referral_reward`, `birthday` already exist).

- New campaign templates in `domain/campaigns.ts` `TEMPLATES`: `loyalty_stamps` (every N paid orders → coupon),
  `referral` (friend gets welcome coupon, referrer gets reward after the friend's first paid order), `birthday`
  (coupon valid for the birthday week).
- Job `campaign-milestones` on order paid: computes stamps (`orders_count` of counted orders), issues coupons
  idempotently (`coupons.milestone_at`, `cycle_key` unique per customer), notifies by WhatsApp/e-mail only when
  `mayMarket`, otherwise the coupon shows in `/conta` only.
- `/conta` shows the stamp card and the referral link `?ref=<code>`.

### S3.5 Marketing messages with consent

Campanhas → Mensagens: compose a message from a template (WhatsApp marketing template or e-mail), choose an
audience filter from S3.3, see the count of contacts allowed (`mayMarket`) and an estimated WhatsApp cost
(per-message price as a setting, **[UNVERIFIED]** current price), send through `message_outbox` with throttling.
Every message carries a one-tap opt-out (`/sair/<token>` sets `marketing_opt_out_at`). Audit every send.

### S3.6 "Meus dados" requests

- Customer: `/conta/dados` (signed in) or a public form (`/privacidade/solicitar`, e-mail confirmation code) to
  request access or deletion.
- `privacy_requests (id, shop_id, customer_id, kind check in ('access','delete'), status, requested_at, due_at,
answered_at, answered_by, note)`; `due_at` = 30 days (small-business doubled deadline per ANPD Res. 2/2022 as
  summarised in the requirements doc **[UNVERIFIED]** exact days; make it a setting).
- Staff: Clientes → Solicitações: access → generates a JSON/CSV export of the customer's data; delete →
  anonymises the customer row (name/phone/email null, `deleted_at`), keeps orders for fiscal records with
  `customer_label = 'Cliente removido'`. Logged in `audit_log`.

### S3.7 Ratings after the order

Job 60 min after `completed` sends (WhatsApp in-window or e-mail, or a link on the tracking page) "Como foi?" with
1–5 stars at `/avaliar/<token>`; `order_ratings (order_id pk, shop_id, stars, comment, created_at)`. Ratings ≤ 3
create a staff notification and are never published. Dashboard tile with the average.

### S3.8 Scheduled orders

- `orders.scheduled_for timestamptz` (migration); checkout offers "Agora" or a slot list (every 15 min inside
  opening hours, from now + prep time to the end of the next opening day; `domain/hours.ts` `slots()`, unit-tested).
  Payment is still taken when placing (owner rule).
- A paid scheduled order becomes `confirmed` as today, with `scheduled_for` set; the kitchen screen hides it until `scheduled_for - prep_time_minutes` (query filter) and the board shows it in a "Agendados"
  lane. `promised_at = scheduled_for`. Capacity checks count scheduled orders in their slot (max per slot setting).

### S3.9 Order-online links

Configurações → Divulgar: the shop link, a QR code PNG download (existing `qrcode` dep), step-by-step texts for the
Google Business Profile "Pedir on-line" link and the Instagram "Pedir comida" button. No API calls.

**Acceptance (S3).** WhatsApp stub: greeting, menu link, status reply and four status templates sent at the right
transitions with signature checks; marketing never reaches an iFood-only contact (test); loyalty coupon issued
exactly once on the Nth order under retries; deletion anonymises and keeps the order totals; a scheduled order is
hidden from the kitchen until its time.

---

## 11. Stage S4: profit view

### S4.1 Recipe cost (ficha técnica) and stock

- Tables: `stock_items (id, shop_id, name, base_unit check in ('g','ml','un'), on_hand_base bigint, min_base
bigint, avg_cost_micro bigint /* centavos × 10^6 per base unit */, blocks_sale boolean, active)`,
  `recipe_lines (id, shop_id, product_sku null, option_sku null, stock_item_id, qty_base integer,
ingredient_id null /* removal skips it */, check (num_nonnulls(product_sku, option_sku) = 1))`,
  `stock_movements (id, shop_id, stock_item_id, kind check in ('sale','sale_reversal','purchase','count_adjust',
'waste'), qty_base bigint signed, unit_cost_micro bigint, source, source_id, reason, created_by, created_at,
unique (source, source_id, stock_item_id, kind))`, `purchases`/`purchase_lines` (supplier name, date, lines with
  qty, total cents).
- Pure `src/lib/domain/recipe.ts`: `expandRecipe(lines, recipes, removals)` and `recipeCostCents(...)`; tested with
  options and removals.
- On confirm (paid), job `stock-deduct` writes `sale` movements; cancel before `preparing` writes reversals, after
  writes `waste`. Stock may go negative; when an item with `blocks_sale` reaches ≤ 0, its linked
  `menu_ingredients.available = false` (existing sold-out logic) and an alert shows on `/staff`.
- Purchase entry updates weighted average cost. Count screen (phone-friendly) writes `count_adjust`.
- Product editor tab "Ficha técnica": lines, cost per unit, margin vs each channel price.
- Screens under Gestão → Estoque: items, purchases, counts, waste.

### S4.2 Fees per payment

- `payment_method_terms (shop_id, method, provider, fee_bps, fee_fixed_cents, settle_days)` seeded per shop:
  `pix_key` 0, `cash` 0, `terminal_card` credit 300 bps / debit 150 bps **[DEFAULT, owner edits]**,
  `mercadopago` pix **[UNVERIFIED]**, `efi` pix 119 bps **[UNVERIFIED]**, `ifood_collected` 320 bps (online
  payment fee per requirements doc **[UNVERIFIED]**).
- `tenders.fee_cents integer not null default 0` set when a tender becomes paid: provider-reported fee when the
  provider returns it (MP payment `fee_details`), else from terms. Backfill job for old tenders.
- Configurações → Pagamentos gains "Taxas" table.

### S4.3 Profit per order and per channel

- `src/lib/domain/profit.ts` (pure): `orderProfit({ totalCents, discountCents, deliveryFeeCents, channelCommissionBps,
paymentFeesCents, deliveryCostCents, foodCostCents })` → net. iFood commission default 1200 bps (shop delivers)
  or 2300 bps (iFood delivers) **[UNVERIFIED]** from the requirements doc; per shop setting
  `channel_settings.ifood_commission_bps`, overridden by payout CSV actuals when present.
- Food cost: from `stock_movements` sale cost for the order when stock is on, else from current recipe cost, else
  "sem ficha técnica" (excluded and counted).
- Relatórios → Lucro: per period, per channel table (orders, gross, discounts, commissions, payment fees, delivery
  cost, food cost, net, net per order), plus the line "Estes N pedidos do iFood teriam rendido R$X a mais no seu
  site" = Σ (iFood commission + iFood payment fee − own-site Pix fee).
- Order detail shows the profit breakdown to admins.

**Worked example (must be reproduced in `tests/integration/profit.test.ts`).** R$45,00 iFood order, shop
delivers, paid in the iFood app: commission 12% = R$5,40, payment fee 3.2% = R$1,44, shop keeps R$38,16 before
food cost. Same order on the site with Pix at 1.19% keeps R$44,46 (fee R$0,54 rounded half-even), R$6,30 more.

### S4.4 Expenses and simple P&L

- `expense_categories (shop_id, id, name, pl_line check in ('cmv','pessoal','ocupacao','marketing','taxas',
'impostos','outros'))` seeded; `expenses (id, shop_id, category_id, description, amount_cents, competence_month
date, paid_at, recurring_id)`; `recurring_expenses (shop_id, id, category_id, description, amount_cents,
day_of_month, active)` with a monthly job creating entries.
- Gestão → Despesas (list, add, recurring). Relatórios → Resultado do mês (DRE simplificado): gross sales −
  discounts/cancellations − estimated taxes (Simples rate setting, `bps`) = net revenue − food cost (real from
  counts if available, else theoretical) − commissions and fees − expenses by line = result. CSV export.

### S4.5 Daily summary to the owner

Job at closing time + 30 min (from `store_hours`, else 23:30): sales, orders, average ticket, by channel, top 3
products, cash difference, unpaid/cancelled count, open alerts → e-mail and (if enabled) WhatsApp utility template
to the owner. Setting in Configurações → Alertas.

**Acceptance (S4).** The worked example passes; profit totals reconcile with sales reports; a product without a
recipe is reported, never counted as zero cost.

---

## 12. Stage S5: running more shops well

### S5.1 Server print queue (D3)

- `print_stations (id, shop_id, name, token_hash, last_seen_at, roles text[] check (roles <@ '{kitchen,receipt}'))`,
  `print_jobs (id, shop_id, station_id null, kind check in ('kitchen','receipt','fiscal'), order_id, status check in
('queued','claimed','printed','failed'), attempts, claimed_at, printed_at, created_at, reprint_of uuid)`.
- Kitchen jobs are inserted when an order becomes `confirmed` (same transaction). A kitchen screen marked "Esta tela
  imprime" (device token cookie, paired by an admin) claims jobs with `update … set status='claimed' where id =
(select id … for update skip locked limit 1) returning *`, prints via the existing hidden-iframe page, then
  acks. Unacked claims return to `queued` after 60 s, max 3 attempts, then `failed` shows on the order.
- Reprint is a button that creates a new job with `reprint_of`. `localStorage` printed-tracking is removed.
- Tests: two stations never print the same job (concurrency test); ack/timeout cycle.

### S5.2 Dynamic time estimate

`domain/estimate.ts`: `estimateMinutes({ prepMinutes, openKitchenOrders, perOrderMinutes, deliveryMinutes })`;
settings `per_order_minutes` (default 2) and `delivery_minutes` (default 20). Used for `promised_at`, the menu
banner and the tracking page. Unit-tested.

### S5.3 Courier dispatch

`couriers (id, shop_id, name, phone, pay_per_delivery_cents, active, access_token_hash)`, `delivery_runs (id,
shop_id, courier_id, left_at, returned_at, settled_at, payout_cents)`, `deliveries (order_id pk, shop_id, run_id,
assigned_at, delivered_at)`. Pedidos → Entregas: ready delivery orders, group into a run, assign courier, print a
route list (addresses + map links). Courier page `/entregador/<token>`: run list, "Saiu" and "Entregue" taps; the
customer tracking page and WhatsApp template show "saiu para entrega". Settle a run: payout recorded as an expense
(S4.4). No pay-on-delivery cash collection (owner rule).

### S5.4 Fee by distance

`delivery_rules.match_kind` gains `'radius_km'` with `radius_m integer` and shop coordinates in `store_profile
(lat, lng)`. Geocoding of the customer CEP: the free ViaCEP for address autofill (**[UNVERIFIED]** availability
terms) and Nominatim (OpenStreetMap, open, strict 1 req/s usage policy) for coordinates, cached in
`geocode_cache (query pk, lat, lng, created_at)`; if geocoding fails, fall back to neighbourhood rules, never block
checkout silently (show `checkout.error.noDelivery`). Haversine in `domain/geo.ts`, unit-tested.

### S5.5 NFC-e contingency and monthly export

- Contingency: check what Focus NFe does for NFC-e offline contingency (`tpEmis = 9`) **[UNVERIFIED]**; if Focus
  handles it, record the contingency status from its response in `fiscal_documents.status = 'contingency'` and
  retry the authorization job until authorized; the receipt prints the contingency notice.
- Monthly export: Nota fiscal → Exportar mês: zip (via `node:zlib` + a minimal zip writer, or the MIT `fflate`
  dependency) of all authorized/cancelled XMLs (downloaded from `xml_url` and cached in storage) plus a CSV of
  totals; e-mail link to the accountant address setting.

### S5.6 Refunds from the screen

Order detail → "Cancelar e devolver": for provider tenders calls `provider.refund` (exists in the interface),
for `pix_key`/cash records a manual refund (cash requires an open drawer, existing rule), cancels the NFC-e when
inside the window (`cancelFiscal`), writes reversals (stock, profit). Permission-gated (S5.7).

### S5.7 Fine-grained permissions and manager PIN

- `roles (id, shop_id, name, system boolean)`, `role_permissions (role_id, permission)`; `shop_members.role_id`.
  Permission constants in `src/lib/server/auth/permissions.ts` (`pos.sell`, `pos.discount`, `orders.cancel_paid`,
  `orders.refund`, `cash.open_close`, `cash.adjust`, `menu.edit`, `menu.availability`, `reports.view`,
  `finance.edit`, `fiscal.manage`, `staff.manage`, `settings.edit`, `customers.view`, `customers.export`).
  Seeded roles Dono, Gerente, Atendente, Cozinha mapping today's admin/attendant/kitchen.
- `requireStaff(event, ADMIN)` call sites move to `requirePermission(event, 'menu.edit')`; nav shows only
  permitted links (`staff/nav.ts`).
- Manager approval: an action needing a permission the operator lacks opens a PIN dialog; the server checks a
  member with that permission by `pin_hash` (argon2id via the MIT `@node-rs/argon2`, or `node:crypto` scrypt to
  avoid a dep), audits both people.

### S5.8 Shifts and time clock

`work_shifts (id, shop_id, member_user_id, starts_at, ends_at, published)`, `time_entries (id, shop_id,
member_user_id, clock_in_at, clock_out_at, device)`. Equipe → Escala (week view) and Ponto (PIN on a shop device).
Weekly hours report flags missing clock-outs. The screen states it is an internal control, not a certified
electronic time clock.

### S5.9 Owner two-step login

Supabase Auth MFA (TOTP) for members with `settings.edit` or `staff.manage`: enrol at Minha conta → Segurança;
`hooks.server.ts` reads the session's `aal`; payment, fiscal, staff and price settings require `aal2` when the
member has a factor, and the shop setting "Exigir verificação em duas etapas para administradores" forces
enrolment. **[UNVERIFIED]** self-hosted GoTrue MFA availability in the vendored Supabase version; check
`deploy/supabase` image tags and skip with a progress note if unavailable.

### S5.10 Offline POS

- Service worker caches the POS shell and the catalog snapshot (`catalog_version`); IndexedDB queue of POS orders
  created offline with client-generated idempotency keys and a local temporary number ("OFF-12").
- Offline, only cash and "cartão na maquininha" tenders are allowed; tickets print via the browser; a banner shows
  "Sem internet: N pedidos aguardando envio".
- On reconnect, orders are posted in order to `/staff/pos/sync` which runs `createOrder` with the stored lines
  (re-priced with the catalog version recorded; if prices changed, the offline price wins and the difference is
  logged in audit), then records tenders. Conflicts (sold out, closed drawer) are listed for staff to resolve.
- e2e: Playwright `context.setOffline(true)`, place two cash orders, go online, both appear on the board once.

### S5.11 Error tracking

`error_events (id, shop_id null, at, where check in ('web','worker','client'), route, message, stack, request_id,
user_kind, count, fingerprint)`; `handleError` and the worker's job-failure log write here (fingerprint de-dup,
count++); a small client reporter posts unhandled errors to `/api/v1/client-errors` (rate-limited). Platform
console → Erros lists by fingerprint. Optional env `SENTRY_DSN` forwards to a self-hosted GlitchTip later (not
built now).

### S5.12 Peak-hour load test

`tests/load/peak.js` for k6 (AGPL tool, run only, not a dependency): 200 orders/hour across 5 shops for 30 min plus
staff board polling; pass when p95 checkout < 800 ms, error rate < 0.5%, no job backlog > 1 min. Document the
result in `docs/load-test.md`. Run against a local docker stack, never production.

### S5.13 Help centre

`src/lib/platform/help/*.md` articles in Portuguese (first steps, cardápio, Pix, nota fiscal, iFood, impressora,
WhatsApp, backups), rendered at `/ajuda` and linked contextually from each settings page ("Como fazer isso?").
WhatsApp support link from a platform setting.

### S5 deferred (needs outside contracts) **[UNVERIFIED]**

Card machine link (Stone, PagBank, Cielo SDKs), on-demand couriers (iFood Entrega sob demanda, Lalamove, Loggi),
iFood financial API. Leave `deferred` lines in the progress file with the reason.

---

## 13. Cross-cutting work

### 13.1 Text catalog

Every new key goes in the module for its area (`catalog.ts` for customers, `staff-ops.ts`, `staff-settings.ts`,
`staff-menu.ts`, `staff-campaigns.ts`, `staff-labels.ts`, `server-errors.ts`). New modules allowed:
`staff-platform.ts` (console), `staff-money.ts` (profit, expenses, stock), `messages.ts` (WhatsApp/e-mail
templates). Register new modules where `TEXTS` is merged and in the group list of Textos do site.

### 13.2 Navigation

`src/lib/staff/nav.ts` additions: Operação → Entregas; Cardápio → Preços por canal, Estoque; Gestão → Clientes,
Lucro, Despesas, Resultado do mês, Repasses iFood; Configurações pages: Sistema, Alertas, Plano e cobrança, WhatsApp,
Canais, Impressão, Permissões, Divulgar. After S5.7, nav is filtered by permission.

### 13.3 Jobs added

`heartbeat`, `alerts-evaluate` (watchdog, not pg-boss), `whatsapp-send`, `email-send`, `stock-deduct`,
`campaign-milestones`, `ifood-menu-sync`, `channel-availability`, `opendelivery-poll`, `opendelivery-event`,
`billing-monthly`, `billing-daily`, `daily-summary`, `rating-request`, `recurring-expenses`, `fiscal-export`.
All idempotent, all carry `shopId` after S1.

### 13.4 Dependencies allowed to add

`nodemailer` (MIT), `fflate` (MIT, zip), optionally `@node-rs/argon2` (MIT). Nothing else without a progress-file
note explaining why the standard library is not enough. `rclone` and `k6` are tools in containers/docs, not npm
deps.

### 13.5 Environment variables added

| Variable                                         | Phase | Purpose                             |
| ------------------------------------------------ | ----- | ----------------------------------- |
| `ADDRESS_HEADER`, `XFF_DEPTH`                    | L1    | client IP behind Caddy/Cloudflare   |
| `RCLONE_REMOTE`, `BACKUP_KEEP_DAYS`              | L5    | off-site backup target, retention   |
| `SMTP_URL`, `ALERT_FROM`                         | L6    | alert and system e-mail             |
| `TENANCY` (`single`/`multi`), `PLATFORM_DOMAIN`  | S1    | hosting mode                        |
| `IFOOD_APP_CLIENT_ID`, `IFOOD_APP_CLIENT_SECRET` | S2    | platform iFood app                  |
| `WHATSAPP_GRAPH_VERSION`                         | S3    | Cloud API version constant override |

Add each to `config.ts` (zod), `deploy/compose.shop.yml`, `deploy/supabase/.env.example` additions in
`deploy/README.md`, and the go-live doc.

### 13.6 Tests and CI

- Unit tests for every new `src/lib/domain/*.ts` file. Integration tests per new service. One e2e flow per stage:
  L (Pix-key order expires; signed-in order shows in /conta), S1 (sign-up → wizard → first order on the new host via
  `Host` header), S2 (stub iFood order through all states), S3 (WhatsApp stub greeting + status), S4 (profit
  report renders the worked example), S5 (dispatch run; offline POS).
- `tests/integration/setup.ts` seeds two shops from S1 on.
- Keep CI non-blocking per owner choice; the agent itself must not push with red checks.

### 13.7 Docs to update

`README.md` (env, modes), `deploy/README.md` (backup, watchdog, multi mode, Caddy on-demand TLS), `docs/go-live.md`
(new steps), `docs/nota-fiscal.md` (IBS/CBS), new `docs/platform.md` (running the hosted platform), new
`docs/whatsapp.md`, `docs/ifood.md` (single app + homologation script), `CONTRIBUTING.md` (withShop rule, new
modules).

---

## 14. Migration list (in order)

| File                                              | Phase                                                                |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| `20261115000001_unpaid_expiry.sql`                | L2                                                                   |
| `20261115000002_customer_contact_phone.sql`       | L3                                                                   |
| `20261115000003_backup_runs.sql`                  | L5                                                                   |
| `20261115000004_heartbeats_alerts.sql`            | L6                                                                   |
| `20261115000005_ibs_cbs.sql`                      | F1                                                                   |
| `20261115000006_modifier_kind.sql`                | H2                                                                   |
| `20261115000007_request_hash.sql`                 | H3                                                                   |
| `20261115000101_shops.sql` … `000105_billing.sql` | S1                                                                   |
| `20261115000201_…` onward                         | S2 (channel adapter columns, channel prices, payouts, Open Delivery) |
| `20261115000301_…` onward                         | S3 (whatsapp, outbox, customer fields, privacy, ratings, scheduled)  |
| `20261115000401_…` onward                         | S4 (stock, recipes, fees, expenses)                                  |
| `20261115000501_…` onward                         | S5 (print queue, couriers, geo, permissions, shifts, errors)         |

All tables created from S1 on include `shop_id uuid not null references shops(id)` and the RLS policy from S1.1
in the same migration. Tables created in L/F/H before S1 (e.g. `alert_settings`, `backup_runs`,
`system_heartbeats`, `ibs_cbs_rates`) are converted by the S1 tenancy migration; `backup_runs` and
`system_heartbeats` stay platform-level (no `shop_id`), `ibs_cbs_rates` stays global (legal rates are national)
with an optional per-shop override table only if the accountant needs one.

---

## 15. Outside steps only the owner can do

| Step                                                                                                            | Needed for |
| --------------------------------------------------------------------------------------------------------------- | ---------- |
| Server, domain and HTTPS for the shop (and later the platform wildcard DNS)                                     | Launch, S1 |
| Set `ADDRESS_HEADER` in the server's `.env` if not using the default compose (L1)                               | Launch     |
| Create an rclone remote (B2 bucket / Drive folder) and copy `rclone.conf`                                       | L5         |
| SMTP account for alerts (e.g. the shop's Gmail with an app password)                                            | L6         |
| Pix key and a staff member watching the bank app during service                                                 | Launch     |
| Accountant: CNPJ, IE, A1 certificate, CSC, CRT, IBS/CBS CST and cClassTrib, 2027 CBS rate; one homologação note | F          |
| iFood: authorize the app, turn off iFood auto-accept/auto-print, run homologation                               | S2         |
| 99Food / Keeta partner onboarding via Open Delivery                                                             | S2         |
| WhatsApp Business account, phone number, approved templates                                                     | S3         |
| PSP account (Mercado Pago or Efí) and one real test payment                                                     | S3         |
| Plan price for other shops; terms, privacy and DPA reviewed by a lawyer                                         | S1         |
| 80 mm printer, kitchen screen, one trial evening                                                                | Launch     |

---

## 16. Ready-to-paste implementation prompt

Paste everything from the title of this document down to here, then this prompt, into one Claude Code session
opened on `gabrielsanson/deku_lib`.

```text
You are implementing the "Deku Lib: implementation spec and build plan" pasted above, in the repository
gabrielsanson/deku_lib (SvelteKit 3, Svelte 5, Tailwind 4, self-hosted Supabase Postgres, pg-boss).

Before writing code:
1. Read CONTRIBUTING.md, README.md, deploy/README.md, docs/go-live.md and the files named in section 1 of the spec.
   The spec's section 1.3 invariants are hard rules.
2. Save the spec verbatim as docs/implementation-spec.md and create docs/implementation-progress.md with one line
   per item ID (L1–L6, F1–F2, H1–H4, S1.1–S1.7, S2.1–S2.5, S3.1–S3.9, S4.1–S4.5, S5.1–S5.13), all "todo".
   If docs/implementation-progress.md already exists, do not recreate it: continue from the first item not "done".
3. Commit those two files ("Add implementation spec and progress list").

Then, for each item in the order of the spec's section 4 (L, F, H, S1, S2, S3, S4, S5):
- Implement exactly what the item says: migration (new file, additive, numbered as in section 14), domain
  functions with unit tests, services with integration tests, routes and screens with the component kit, text
  catalog keys in Portuguese, docs.
- Outside services: interface + vendor adapter + local stub; never call a real service from tests; production
  refuses the stub. Anything marked [UNVERIFIED] gets a TODO(verify) comment and stays behind a switch that is off
  by default.
- [DEFAULT] decisions: build the default as written. [OWNER] steps: do not wait for them; document them.
- Run the fast checks (pnpm check, pnpm lint, pnpm test) while working and `pnpm verify` before each commit; run
  the browser tests (recipe in CONTRIBUTING.md, SHOP_PRESET=deku, PAYMENT_PROVIDER=local_stub) at the end of
  every phase that changed a screen. When a test fails, re-run only the failing tests while fixing, then the full
  suite once.
- Commit one item at a time with a plain-English message about what changed for the shop, update its line in
  docs/implementation-progress.md in the same commit, and push. The owner's rule is to push straight to main
  after pnpm verify; if this environment requires a different branch, push to that branch instead and say so.
- Never push red. Never skip, disable or weaken a test to get green. Never edit an applied migration. Never
  reintroduce pay-on-delivery or tabs. Never remove the Pix-to-shop-key flow. Keep the platform fully usable with
  iFood, WhatsApp, PSP and fiscal all switched off.
- If the spec and the code disagree, keep the code's invariants, choose the smallest safe reading of the spec,
  and write the conflict in the progress file.
- If an item cannot be built without an outside account or an unavailable API, build the adapter and stub, mark
  the item "done (stub only)" or "deferred: <reason>" and move on.

Phase gates (from section 4): do not start S1 before L, F and H are done and green. F1 (IBS/CBS) must be on main
before 1 January 2027. Do not start S2 before the S1 isolation test passes and a single-shop install upgrades from
pre-tenancy data in the migration test.

At the end of each phase, write a short summary at the top of docs/implementation-progress.md: what was built,
what is stub-only, what the owner must do next (from section 15). If you run out of time, stop at a clean commit;
the next run continues from the progress file.
```

---

## Sources and verification notes

- Requirements document, 15 Nov 2026 (copy at `/mnt/project-files/reports/platform-requirements-2026-11-15.md`)
  and its sources (iFood plans via Saipos, Meta WhatsApp pricing, Focus NFe prices, Mercado&Consumo on IBS/CBS
  dates, Efí and Asaas fees, Demarest on ANPD Res. 2/2022).
- Standards review, 23 Oct 2026 (`/mnt/project-files/reports/standards-review-2026-10-23.md`): items 1–8.
- Store-management technical specification, 23 Oct 2026 (tenancy design reused in S1).
- Focus NFe reforma tributária guide (`https://focusnfe.com.br/guides/reforma-tributaria/`) and NF-e field
  reference (`https://campos.focusnfe.com.br/nfe/NotaFiscalXML.html`), read 15 Nov 2026: item field names,
  2026 test rates, "facultativo" for Simples Nacional in 2026. The reference does not list totals fields.
- Could not be verified on 15 Nov 2026: iFood developer portal (distributed-app auth, catalog API), Mercado Pago
  fee page and webhook `ts` unit, Efí API details, Open Delivery partner specifics for 99Food and Keeta, the 2027
  CBS rate, iFood payout CSV columns, self-hosted GoTrue MFA support.
