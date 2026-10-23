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
| A Mercado Pago account (optional)                          | Automatic online Pix/card              | Access token + webhook secret in `.env`, see section 5                     |

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
4. **Equipe:** one account per person: admin, or kitchen for the kitchen TV.
5. **Pagamentos:** Pix to the shop's key. Every site order is paid when it is placed.
6. **iFood (optional):** paste the Client ID, Client Secret and Merchant ID,
   click "Salvar e testar", read any error explanation, then turn on automatic
   orders. Skip it to key iFood orders in the Caixa as "iFood (manual)".
7. **Concluir:** review and open the store.

Also edit the site's text pages (about, allergens, privacy, delivery terms) in
Cardápio → Editar cardápio → Páginas do site. Change the site's colours, logos
and app icon in Configurações → Aparência, and any button, notice or message the
customer sees in Configurações → Textos.

## 4. Before opening

- Make a Pix test order of R$ 1 and check it lands in the right bank account.
- Run a backup and a restore drill ([deploy/README.md](../deploy/README.md#backups)).
- Run the [smoke tests](#6-smoke-tests).

## 4a. Cash drawer and printing

The staff's day-to-day routine (open, serve, close) is in plain Portuguese in
[rotina-diaria.md](rotina-diaria.md).

**Gaveta (Operação → Gaveta).** Open the drawer at the start of the day with the
change float. Cash sales are refused while it is closed. Record cash taken out
(sangria, with a reason) or put in (suprimento) there. To close, count all the
cash in the drawer and type the total: the difference against what the system
expected shows only after closing and cannot be edited. Admins see the expected
amount while the drawer is open; Caixa do dia lists each day's sessions.

**Printing.** Any 80 mm thermal printer that the shop PC can print to works.

1. Install the printer's Windows driver and set paper width to 80 mm and margins to 0.
2. Make it the default printer on the PC that shows the kitchen screen.
3. Start Chrome or Edge with `--kiosk-printing` (add it to the shortcut, as for the
   totem in [totem.md](totem.md)) so tickets print without a dialog.
4. On `/kitchen`, tap **Impressão desligada** to turn on automatic tickets: each new
   order prints once on that PC. Orders already on the screen are not reprinted.

Staff can also print the kitchen ticket or the customer receipt from any order
page (**Imprimir comanda**, **Imprimir recibo**) and the receipt right after a
counter sale. The receipt says it is not a fiscal document.

**Room screen.** Open `/painel` on the TV in the dining room (no login). It shows
order codes under "Preparando" and "Pronto", refreshes every 4 seconds and chimes
when an order is ready or called again. Tap the screen once so the browser allows
sound. Delivery orders are not shown.

## 5. Optional parts

### Nota fiscal (NFC-e)

Off by default. The owner's accountant follows [nota-fiscal.md](nota-fiscal.md) (CNPJ + IE,
A1 certificate, CSC, Focus NFe account and API token, NCM/CFOP/CSOSN), then an admin fills in
**Configurações → Nota fiscal**, tests in homologação and switches to produção. Paid non-iFood
orders get a `fiscal-issue` job; status, DANFE link, retry and cancel are on the order page.

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

### Automatic online payments (Mercado Pago)

Only needed if you want Pix confirmed automatically or card payments on the site.
Without it, the site takes Pix to the shop's key and staff confirm it by hand.

1. Create a Mercado Pago account for the shop (CNPJ or CPF) and open
   [Suas integrações](https://www.mercadopago.com.br/developers/panel/app) → **Criar aplicação**
   (product: "Pagamentos online", "Checkout Pro").
2. In the app, copy the **Access Token** from _Credenciais de produção_ (`APP_USR-…`).
   For a dry run use the _Credenciais de teste_ token (`TEST-…`) and test cards.
3. In the app → **Webhooks**: URL `https://pedido.example.com/api/v1/payments/webhooks/mercadopago`,
   event **Pagamentos**, save, and copy the **Assinatura secreta**.
4. Add to `deploy/supabase/.env` and restart (`deploy/shop.sh up -d`):

   ```sh
   PAYMENT_PROVIDER=mercadopago
   MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
   MERCADOPAGO_WEBHOOK_SECRET=...
   ```

5. Check Configurações → Integrações says "Mercado Pago conectado", then pay real
   small amounts with Pix and a card, refund one in the Mercado Pago panel, and
   compare against `/staff/reconciliation`.

Pix gives a "copia e cola" code and QR on the payment page and confirms on its own.
Card opens Mercado Pago's page (credit or debit, one installment) and comes back
to the order. Another PSP is one more `PaymentProvider` in `src/lib/server/payments/`.

## 6. Smoke tests

- [ ] Staff login for each role. The kitchen account gets "403" on the POS.
- [ ] POS: sell with cash (with change) and a Pix reference. The order shows on the KDS only after the payment is confirmed, within a few seconds. Bump it to completed.
- [ ] Put the KDS tablet in airplane mode for 20 s. The stale banner appears and clears when the tablet reconnects.
- [ ] Web: order and pay by Pix (shop key). The QR opens in the bank app with the right amount and name. It stays out of the KDS until you record the Pix on the order; then it is confirmed and the KDS shows it.
- [ ] On an Android phone, place a pickup order, tap "Avisar quando ficar pronto" and allow. Mark it Pronto: the phone shows "Seu pedido está pronto!". Tap "Chamar": it buzzes again.
- [ ] Web delivery to a CEP outside the zones is refused with a clear message.
- [ ] Pause the store in Configurações → Loja. The site refuses new orders, and reopening works.
- [ ] Edit a product's price and photo. The site and the POS show the change.
- [ ] Mark an item sold out. It shows as sold out on the site and is disabled in the POS.
- [ ] Open the drawer with a float, sell in cash, record a sangria, then close it with a blind count. The difference is right and shows in Caixa do dia.
- [ ] With automatic printing on, a new order prints one kitchen ticket; reloading the kitchen screen does not reprint it.
- [ ] `/staff/reconciliation` for today matches the drawer count.
- [ ] Analytics CSV export opens in a spreadsheet with correct accents.
- [ ] Install the KDS on the kitchen tablet ("Add to home screen" on `/kitchen`).

## 7. Operations

- **Backups:** see [deploy/README.md](../deploy/README.md#backups).
- **Alerts:** use an uptime monitor on `/health/ready`, and watch worker logs for `"job failed"`.
- **Incidents:** if the site misbehaves, pause it in Configurações → Loja. The
  counter keeps working. If iFood misbehaves, turn it off in Configuração → iFood
  and use "iFood (manual)" in the POS.
