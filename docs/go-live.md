# Go-live guide

These are the steps from this repository to a running shop. Steps marked
**owner** need an account, a contract or a decision that only the shop owner can make.

## 1. Accounts (owner)

| What                                                                               | Why                             | Notes                                                          |
| ---------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------- |
| Supabase: two projects, `staging` and `production`, region `sa-east-1` (São Paulo) | Database, staff login, realtime | Pro plan for daily backups; enable PITR on production          |
| Fly.io account (or a VPS for `docker-compose.yml`)                                 | Runs web + worker               | `fly.toml` targets `gru` (São Paulo)                           |
| A domain (e.g. `pedido.dekuburger.com.br`)                                         | Customer site and webhooks      | HTTPS is required for Pix/card webhooks and the PWA            |
| Directus hosting + licence check                                                   | Menu editing                    | Self-host (compose) or Directus Cloud. Confirm BSL eligibility |
| PSP contract (Mercado Pago, Pagar.me, Stripe BR, Asaas…)                           | Online Pix/card                 | Needs development work first (see section 5)                   |
| iFood Merchant API access                                                          | Automatic iFood orders          | Requires iFood partner approval + homologation                 |

## 2. Database

```sh
pnpm exec supabase link --project-ref <staging-ref>
pnpm exec supabase db push
```

In the Supabase dashboard:

- **Auth → Providers:** keep email/password and turn off "allow new users to
  sign up". Staff accounts are created by the owner in Configurações → Equipe, or by `pnpm seed`.
- **Auth → URL configuration:** site URL = your domain.
- **Database → Connection string:** use the **session** pooler (port 5432) or
  the direct connection for `DATABASE_URL`. Do not use the transaction pooler (6543).

Create the first owner, then change or remove the demo accounts:

```sh
DATABASE_URL=… PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
SEED_PASSWORD='<strong temporary password>' NODE_ENV=production pnpm seed
```

Then sign in as `dono@burger.local` and add the real staff in Configurações → Equipe.
Deactivate the four demo accounts there.

## 3. Directus

- Run Directus (compose service `directus`, or Directus Cloud) with its own
  database. It can be a separate database in the same Supabase project.
- Bootstrap it:

  ```sh
  DIRECTUS_URL=https://cms.example DIRECTUS_ADMIN_EMAIL=… DIRECTUS_ADMIN_PASSWORD=… \
  APP_URL=https://pedido.example CMS_WEBHOOK_SECRET=<32 random chars> pnpm cms:bootstrap
  ```

- Save the printed `DIRECTUS_TOKEN`; it is shown only once.
- Enter the real menu: categories, products (price in centavos), option groups and options.
- Use each product's SKU as its external code in iFood.

## 4. App deploy (Fly.io)

```sh
fly launch --no-deploy --copy-config --name <app-name>
fly secrets set \
  DATABASE_URL='postgresql://…:5432/postgres' \
  PUBLIC_SUPABASE_ANON_KEY='…' SUPABASE_SERVICE_ROLE_KEY='…' \
  SHOP_NAME='Deku Burger' \
  DIRECTUS_URL='https://cms.example' DIRECTUS_TOKEN='…' CMS_WEBHOOK_SECRET='…' \
  PUBLIC_SUPABASE_URL='https://<ref>.supabase.co'
fly deploy --build-arg PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
fly scale count web=1 worker=1
fly certs add pedido.example
```

Check that `https://pedido.example/health/ready` returns `{"ready":true}`. Then
check that the worker logs show `worker started`. Next, run through
[smoke tests](#6-smoke-tests) on staging. Repeat the same steps for production.

## 5. Turning on the gated parts

### Online payments

1. Implement `PaymentProvider` for the chosen PSP in
   `src/lib/server/payments/<psp>.ts`. Use `local-stub.ts` as the template. The
   rules that must hold are already covered by tests for the stub
   (`tests/integration/payments.test.ts`): idempotent checkout creation, the
   signature checked on raw bytes, duplicate events ignored, no regression
   after `paid`, and the provider asked before an unpaid checkout expires.
2. Add the provider name to `PAYMENT_PROVIDER` in `src/lib/server/config.ts` and to `paymentProvider()`.
3. Register `https://pedido.example/api/v1/payments/webhooks/<psp>` in the PSP dashboard.
4. On staging, pay real small amounts with Pix and a card, refund one, and compare against `/staff/reconciliation`.

### iFood

1. Get merchant API credentials and the merchant id from iFood.
2. Re-check `src/lib/server/integrations/ifood/api.ts` against the current iFood
   docs. Check the paths, the token request body, the webhook signature header and
   algorithm, and the cancellation codes. Every path is in `IFOOD_PATHS`.
3. On staging set `IFOOD_ENABLED=true`, `IFOOD_CLIENT_ID`, `IFOOD_CLIENT_SECRET`, `IFOOD_MERCHANT_ID`.
   If iFood uses webhooks for your account, register
   `https://<staging>/api/v1/integrations/ifood/webhook`. Polling runs anyway
   every 30 s.
4. Run iFood's homologation checklist with test orders. Then record real
   payloads (with personal data removed) into `tests/fixtures/ifood/` and run the tests.
5. Watch Configurações → Integrações: received events, failures, and calls sent to iFood.

## 6. Smoke tests

On staging, then production:

- [ ] Staff login for each role. The kitchen account gets "403" on the POS.
- [ ] POS: sell with cash (with change) and a Pix reference. The order shows on the KDS within a few seconds. Bump it to completed.
- [ ] Put the KDS tablet in airplane mode for 20 s. The stale banner appears and clears when the tablet reconnects.
- [ ] Web: order with pickup, pay on pickup. It appears as "Aguardando confirmação". Confirm it, and the KDS shows it.
- [ ] Web delivery to a CEP outside the zones is refused with a clear message.
- [ ] Pause the store in Configurações → Loja. The site refuses new orders, and reopening works.
- [ ] Mark an item sold out. It shows as sold out on the site and is disabled in the POS.
- [ ] `/staff/reconciliation` for today matches the drawer count.
- [ ] Analytics CSV export opens in a spreadsheet with correct accents.
- [ ] Install the KDS on the kitchen tablet ("Add to home screen" on `/kitchen`).

## 7. Operations

- **Backups:** see the README. Run a restore drill once before launch.
- **Alerts:** use an uptime monitor on `/health/ready`, and watch worker logs for `"job failed"`.
- **Incidents:** if the site misbehaves, pause it in Configurações → Loja. The
  counter keeps working. If iFood misbehaves, set `IFOOD_ENABLED=false` and use
  "iFood (manual)" in the POS.
