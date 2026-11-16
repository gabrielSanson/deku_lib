# Implementation progress

One line per item of `docs/implementation-spec.md`. A later run continues from the first item that is not done.

## Run of 2026-11-16: stage S2 (delivery apps), merged to main

All 5 S2 items are done. `pnpm verify` is green (166 unit, 153 database tests) and the 28 browser tests pass.
iFood and Open Delivery (99Food, Keeta) orders share one channel engine; a cancel made in the store waits for
the app's confirmation.

**Off or unverified (switches stay off):** the iFood app link (shown only with IFOOD_APP_CLIENT_ID/SECRET),
iFood catalog sync paths, the iFood payout export columns and every Open Delivery path, event and signature are
TODO(verify). Open Delivery can be turned on per partner only after a passing connection test.

Owner to do: register the platform app with iFood and set IFOOD_APP_CLIENT_ID/SECRET; ask 99Food and Keeta for
Open Delivery credentials and run one test order with each before turning them on.

## Run of 2026-11-16: stage S1 (hosted multi-shop), merged to main

All 7 S1 items are done. `pnpm verify` is green (159 unit, 131 database tests), the 28 browser tests pass
(single-shop mode), and multi-shop mode was tried by hand against a local Supabase: sign-up, a new shop's
site and every staff screen, CSV import, the console and the read-only view all work; the platform pages
404 on shop hosts.

Fixed on the way: redirects to another host (sign-up, "Ver como a loja", Google sign-in, card checkout)
now pass `external: true`, which this SvelteKit refuses without (Google sign-in and card checkout were
broken before S1 too).

Owner to do: platform Pix key and price in /plataforma/configuracoes; DNS wildcard; lawyer review of the
legal drafts; `scripts/create-platform-admin.ts` for the first admin.

## Run of 2026-11-15: phases L, F and H (stopped before S1, as asked)

All 12 items are done on branch `claude/project-thread-8hxhtq` (not yet merged to main). `pnpm verify` is green
(141 unit, 107 database tests) and the 28 browser tests pass against a local Supabase.

**Built:** per-customer rate limits behind Caddy (L1); unpaid Pix/totem orders expire after 20/15 minutes, set in
Loja (L2); guest orders join an account only by verified e-mail (L3); signed-in orders always land on the account
(L4); nightly off-site backups with a weekly restore test and a Sistema page (L5); watchdog alerts by e-mail and
staff push (L6); IBS/CBS on NFC-e lines with a yearly rates table (F1); fiscal readiness checklist, R$ 1 test note
and failed-note retry (F2); Mercado Pago webhook timestamp and id fix (H1); removals stored as `kind` (H2); a reused
order key with a different cart is refused (H3); checkout and the till renew the key when the order changes (H4).

**Off or unverified (switches stay off):**

- IBS/CBS (`ibs_cbs_enabled`, Configurações → Nota fiscal) is off. Focus's totals field names and the tax base
  (gross − discount + delivery) are TODO(verify). The 2027 rates must be saved by the owner before 1 Dec 2026, or
  notes stop with "confirme as alíquotas".
- Mercado Pago timestamp unit is TODO(verify) with one sandbox payment (both seconds and milliseconds accepted).
- The 'disk' alert kind is not checked; tests/selfhost/backup-check.mjs is manual (no self-host CI job).

**Owner steps before launch (section 15):**

1. Set `SMTP_URL` and `ALERT_FROM` in the server's `.env` (e.g. Gmail app password), then send the test alert from
   Configurações → Sistema and subscribe the staff phones there.
2. Create the rclone remote, copy `deploy/backup/rclone.conf`, and check the first backup on the Sistema page.
3. Accountant: CRT, IBS/CBS CST and cClassTrib, the 2027 CBS/IBS rates, then one homologação test note.
4. One Mercado Pago sandbox payment to confirm the webhook (only if Mercado Pago is used).
5. Set `ADDRESS_HEADER` only if not using the bundled compose (defaults are in place).

- L1: done 25ad6a5 (deploy check is a unit test on the compose files (src/lib/server/deploy-config.spec.ts) instead of tests/selfhost/setup-check.mjs, which drives a browser and cannot read container env; login limiters added to staff and customer sign-in)
- L2: done 754a719 (text keys follow the existing groups: store.unpaidPix/unpaidCounter and payment.deadline/expired/reorder instead of settings.store.* and checkout.payment.*)
- L3: done b9c15c9 (also merges a guest record when the e-mail is verified after the account was made)
- L4: done f18d19f (not applied at the shared totem)
- L5: done 2bfd862 (scripts run against a real Postgres 16 here; tests/selfhost/backup-check.mjs is for a live stack (there is no self-host CI job); the backup image is a 3-line Dockerfile on postgres:16-alpine so rclone is also there for 'rclone config')
- L6: done d88a5b0 (new dependency nodemailer 10.2.1 (MIT-0, allowed by 13.4); fiscal_errors (3+ failed notes in an hour) is evaluated here too; the 'disk' kind is in the table but not checked yet (the watchdog container cannot see the host disk))
- F1: done 15f5bb1 (switch ibs_cbs_enabled stays off; Focus totals field names are TODO(verify); base = gross - discount + delivery is TODO(verify); the 2027 row counts as confirmed once the owner saves the rates table (any save after the seed), instead of 'note changed after 1 Dec'; CRT is stored for the readiness check, not sent to Focus)
- F2: done 6c5a9be (fiscal_errors alert lives in the L6 watchdog; docs/nota-fiscal.md has the IBS/CBS steps and the SVRS validator link)
- H1: done 53afa67 (replay window kept at the code's 15 minutes (spec said 'keep the 5-minute window'; the code had 15); ts unit TODO(verify) with one sandbox payment)
- H2: done 1b1403a (new modifier kind column, backfilled from the old 'Sem ' rule; stored label kept as the order snapshot)
- H3: done a383edc (skipped for iFood, which keys on its own order id; older orders without a hash still match)
- H4: done f311c65 (shared OrderKey helper in src/lib/client/order-key.ts, used by the cart, checkout and POS)
- S1.1: done 5235384, 22f3573 (on a real Supabase app_server may not read the auth schema, so team e-mails come through the platform connection and tests revoke that access too; shop_id defaults to current_shop_id() so services need no changes; shop work uses a per-shop connection pool (role app_server + app.shop_id) instead of withShop at every call site and an ESLint rule; staff_users stays as one row per person, roles in shop_members; iFood keys stay in ifood_settings (already per shop, encrypted); MP keys in shop_secrets; old photos found at the bucket top level instead of a move script; ibs_cbs_rates got an optional shop_id (shop overrides national rows))
- S1.2: done 3053bf1 (platform landing is /conheca (the platform root redirects there); staff of several shops get /staff/lojas; Caddyfile.multi for on-demand TLS; shop #1 gets loja.<domain> when switching to multi)
- S1.3: done b6f0750 (the account is created first (members need its id) and removed if the shop cannot be saved; a half-made shop is closed and frees its address; platform pages (landing, sign-up, legal) use fixed Portuguese text instead of the per-shop text catalog; legal drafts in src/lib/platform/legal marked for a lawyer)
- S1.4: done 5b06aaf (view link is a signed 30-minute token, not a bare shop id cookie; console text is fixed Portuguese)
- S1.5: done 3aa1f67 (manual_pix only (PSP adapter later); shop #1 never pays; first invoice on the 1st after the trial ends; due on the 10th; audit_log.shop_id may be null for platform-level entries)
- S1.6: done 3e82e99 (accepts ; or , CSV; re-importing updates products with the same name; also linked from the setup wizard's menu step)
- S1.7: done 4a4d2ce (applied at sign-up (src/lib/server/presets/business-types.ts); shops.preset keeps the blank/deku looks)
- S2.1: done (the shop comes from the request scope instead of a ShopRef argument; pushStatus is split into planStatus (recorded once in channel_outbound) and sendStatus; channel_events/outbound name the adapter (opendelivery_99food), orders use channel opendelivery + channel_partner)
- S2.2: done ([UNVERIFIED] flow shown only when IFOOD_APP_CLIENT_ID/SECRET are set (or IFOOD_APP_STUB locally), every path TODO(verify); the owner pastes iFood's authorization code instead of us polling for it; refresh token in shop_secrets ifood_refresh; payloads kept only while homologation is on; CARF/CANCELLATION_REQUEST_FAILED clears a pending cancel (TODO(verify) codes))
- S2.3: done ([UNVERIFIED] iFood catalog paths/fields in ifood/catalog.ts, TODO(verify); markup lives in channel_settings (not on menu_products); iFood prices apply to iFood manual POS orders and the sync, site/counter untouched; synced items recorded in integration_mappings to tell created from updated)
- S2.4: done ([UNVERIFIED] export format: columns found by header name with built-in aliases, and the shop can set its own names; page at Relatórios → Repasses iFood (/staff/analytics/repasses-ifood); missing = completed non-test iFood orders in the statement's dates)
- S2.5: done ([UNVERIFIED] every path, event type, cancel code and the webhook signature (HMAC of the body with the client secret, x-app-signature) are TODO(verify); a partner can only be turned on after a passing connection test, and stays off until the owner does; settings at Configurações → 99Food e Keeta; one poll per shop and partner (advisory lock); the client secret lives in shop_secrets)
- S3.1: done ([UNVERIFIED] Graph API version (v21.0 in one constant), template language pt_BR, body parameter order (nome, numero, loja), the webhook payload shape and the hello_world test template are TODO(verify); WhatsApp turns on only after a successful test message; 'saiu_para_entrega' is sent when an own-driver delivery is marked ready (there is no separate dispatched status); staff see who asked for a person on the orders board, with a wa.me link and 'Atendido'; channel-app orders are never messaged; customers.whatsapp_updates_at added here (spec lists it under S3.3))
- S3.2: done ([UNVERIFIED] Efí base URLs, token body, x-skip-mtls-checking and the ?ignorar= webhook trick are TODO(verify) with one sandbox charge; the webhook is checked by a secret ?hmac= token in its URL (the PSP authenticates by mTLS on its side) and the payment status is always read back from GET /v2/cob, never trusted from the notification; Pix only (card refused with Efí); the shop's own Pix key stays a separate switch (Pagamentos → Pix) the owner can turn off; certificate .p12 uploaded in Configurações → Pagamentos, stored encrypted)
- S3.3: done (counter orders are source 'pos'; a delivery-app contact who later orders on the shop's own channel becomes the shop's contact (source switches to own/pos); 'frequent' = 5+ orders; marketing CSV holds only mayMarket contacts with phone and e-mail, the delivery CSV holds everyone with no phone or e-mail; exports are audited; birthday, marketing_opt_out_at and an opt-out token are added here for S3.4/S3.5)
- S3.4: done (set up in a dedicated page Campanhas → Fidelidade (one campaign per kind, not the generic editor); stamps count paid, kept, non-test web/counter orders since the programme started, and every milestone reached is issued once (cycle_key unique per customer), so a skipped or repeated job still pays exactly once; the referral link carries the referrer's own welcome coupon (?ref=CODE fills the checkout code), valid on a friend's first order only and never for the referrer; the reward is issued when that order is paid; birthday coupons are issued daily at 08:00 for the coming 7 days, 29 Feb counts as 28 Feb; coupons are always shown on /conta and e-mailed only to contacts who accept offers (WhatsApp marketing templates are left to S3.5))
- S3.5: done (page at Campanhas → Mensagens; audience = the S3.3 filters, own sources only, mayMarket; e-mail or an approved WhatsApp marketing template (variables nome and the opt-out link are TODO(verify)); per-message WhatsApp price is a setting (default R$ 0,35, [UNVERIFIED] current Meta price); 10 messages a second through message_outbox; the one-tap /sair/<token> link opts out on open (a mail scanner opening it would also opt the person out; accepted for one-tap); every send is in marketing_sends and audit_log)
- S3.6: done (due days setting default 30 TODO(verify) ANPD deadline; public form confirmed by e-mailed code, 5 tries; deletion anonymises and keeps orders as 'Cliente removido')
- S3.7: done (WhatsApp only inside the 24 h window, else e-mail, always a link on the tracking page; one rating per order, private; 3 stars or less e-mails the alert recipients and stays on the staff home until marked seen; average of 30 days on the staff home (not shown to kitchen))
- S3.8: done (off by default (Configurações → Tipos de pedido); slots every 15 min from now + prep to the end of the next opening day; while closed with scheduling on, the site takes orders for later only (dine-in off); kitchen hides the order until scheduled_for − prep; 'Agendados' lane on the board; max orders per slot setting; scheduled orders do not count against the open-order cap until due)
- S3.9: todo
- S4.1: todo
- S4.2: todo
- S4.3: todo
- S4.4: todo
- S4.5: todo
- S5.1: todo
- S5.2: todo
- S5.3: todo
- S5.4: todo
- S5.5: todo
- S5.6: todo
- S5.7: todo
- S5.8: todo
- S5.9: todo
- S5.10: todo
- S5.11: todo
- S5.12: todo
- S5.13: todo
