# Go-live guide

These are the steps from this repository to a running shop on your own server.
Steps marked **owner** need an account, a purchase or a decision that only the
shop owner can make. Nothing here needs a paid licence or a cloud host.

## 1. What you need (owner)

| What                                                       | Why                                    | Notes                                                                      |
| ---------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| A Linux machine with Docker (VPS or a mini PC in the shop) | Runs Supabase, the shop and the worker | 4 GB RAM, 2 cores, 20 GB disk. See [deploy/README.md](../deploy/README.md) |
| A domain (e.g. `pedido.dekuburger.com.br`)                 | Customer site, staff login, webhooks   | HTTPS is required for the installable apps and for iFood                   |
| A way in from the internet                                 | Customers and iFood reach the shop     | Open ports 80/443, or a free Cloudflare Tunnel                             |
| A Pix key in the shop's bank account (optional)            | Web customers pay by Pix               | Staff confirm each Pix by hand in the bank app                             |
| iFood Merchant API access (optional)                       | Automatic iFood orders                 | Developer portal app + store authorisation; homologation recommended       |
| A payment provider (PSP) contract (optional)               | Automatic online Pix/card              | Needs development work first, see section 5                                |

## 2. Install

On the server:

```sh
git clone https://github.com/gabrielSanson/deku_lib.git && cd deku_lib
sh deploy/setup.sh pedido.example.com "Deku Burger"
deploy/shop.sh up -d --build
deploy/shop.sh exec shop-web node --import tsx scripts/create-owner.ts voce@email.com "Seu nome" 'uma-senha-forte'
```

Check that `https://pedido.example.com/health/ready` returns `{"ready":true}`
and that `deploy/shop.sh logs shop-worker` shows `worker started`.

New sign-ups are turned off: only the owner creates staff accounts, in
Configurações → Equipe.

## 3. Setup wizard

Sign in at `https://pedido.example.com/staff/login` as the owner. The home screen
points to **Configuração** until it is finished:

1. **Loja:** name, phone, pickup address.
2. **Cardápio:** create categories, products (with photos), option groups, or
   start from the sample menu and edit it. Each product has a code (SKU); if you
   sell on iFood, use it as the "código externo" there.
3. **Retirada e entrega:** turn pickup and own delivery on or off, and add
   delivery areas and fees.
4. **Equipe:** one account per person (owner, manager, cashier, kitchen).
5. **Pagamentos:** pay on pickup/delivery, and/or Pix to the shop's key.
6. **iFood (optional):** paste the Client ID, Client Secret and Merchant ID,
   click "Salvar e testar", read any error explanation, then turn on automatic
   orders. Skip it to key iFood orders in the Caixa as "iFood (manual)".
7. **Concluir:** review and open the store.

Also edit the site's text pages (about, allergens, privacy, delivery terms) in
Cardápio → Editar cardápio → Páginas do site.

## 4. Before opening

- Make a Pix test order of R$ 1 and check it lands in the right bank account.
- Run a backup and a restore drill ([deploy/README.md](../deploy/README.md#backups)).
- Run the [smoke tests](#6-smoke-tests).

## 5. Optional parts

### iFood

The integration was written from iFood's public docs and has not been through
iFood homologation. The setup wizard tests the credentials (token, then a read of
the store) and explains failures in Portuguese. While it is on, the home screen
warns when polling fails, when no poll has succeeded for 3 minutes, or when
events or status updates failed.

Before relying on it:

1. Re-check `src/lib/server/integrations/ifood/api.ts` against the current iFood
   docs: the paths (all in `IFOOD_PATHS`), the token request body, the webhook
   signature header and algorithm, and the cancellation codes.
2. If iFood uses webhooks for your app, register the address shown in the wizard.
   Polling runs every 30 s either way.
3. Place test orders, follow them in iFood's Gestor de Pedidos too, then record
   real payloads (with personal data removed) into `tests/fixtures/ifood/` and run the tests.
4. Watch Configurações → Integrações: received events, failures, and calls sent to iFood.

### Automatic online payments

Only needed if you want Pix confirmed automatically or card payments on the site.

1. Implement `PaymentProvider` for the chosen PSP in
   `src/lib/server/payments/<psp>.ts`. Use `local-stub.ts` as the template. The
   rules that must hold are already covered by tests for the stub
   (`tests/integration/payments.test.ts`): idempotent checkout creation, the
   signature checked on raw bytes, duplicate events ignored, no regression
   after `paid`, and the provider asked before an unpaid checkout expires.
2. Add the provider name to `PAYMENT_PROVIDER` in `src/lib/server/config.ts` and to `paymentProvider()`.
3. Register `https://pedido.example.com/api/v1/payments/webhooks/<psp>` in the PSP dashboard.
4. Pay real small amounts with Pix and a card, refund one, and compare against `/staff/reconciliation`.

## 6. Smoke tests

- [ ] Staff login for each role. The kitchen account gets "403" on the POS.
- [ ] POS: sell with cash (with change) and a Pix reference. The order shows on the KDS within a few seconds. Bump it to completed.
- [ ] Put the KDS tablet in airplane mode for 20 s. The stale banner appears and clears when the tablet reconnects.
- [ ] Web: order with pickup, pay on pickup. It appears as "Aguardando confirmação". Confirm it, and the KDS shows it.
- [ ] Web: order and pay by Pix (shop key). The QR opens in the bank app with the right amount and name. Record the Pix on the order, accept it, and the KDS shows it.
- [ ] Web delivery to a CEP outside the zones is refused with a clear message.
- [ ] Pause the store in Configurações → Loja. The site refuses new orders, and reopening works.
- [ ] Edit a product's price and photo. The site and the POS show the change.
- [ ] Mark an item sold out. It shows as sold out on the site and is disabled in the POS.
- [ ] `/staff/reconciliation` for today matches the drawer count.
- [ ] Analytics CSV export opens in a spreadsheet with correct accents.
- [ ] Install the KDS on the kitchen tablet ("Add to home screen" on `/kitchen`).

## 7. Operations

- **Backups:** see [deploy/README.md](../deploy/README.md#backups).
- **Alerts:** use an uptime monitor on `/health/ready`, and watch worker logs for `"job failed"`.
- **Incidents:** if the site misbehaves, pause it in Configurações → Loja. The
  counter keeps working. If iFood misbehaves, turn it off in Configuração → iFood
  and use "iFood (manual)" in the POS.
