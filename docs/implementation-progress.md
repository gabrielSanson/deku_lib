# Implementation progress

One line per item of `docs/implementation-spec.md`. A later run continues from the first item that is not done.

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
- S1.1: done (shop_id defaults to current_shop_id() so services need no changes; shop work uses a per-shop connection pool (role app_server + app.shop_id) instead of withShop at every call site and an ESLint rule; staff_users stays as one row per person, roles in shop_members; iFood keys stay in ifood_settings (already per shop, encrypted); MP keys in shop_secrets; old photos found at the bucket top level instead of a move script; ibs_cbs_rates got an optional shop_id (shop overrides national rows))
- S1.2: done (platform landing is /conheca (the platform root redirects there); staff of several shops get /staff/lojas; Caddyfile.multi for on-demand TLS; shop #1 gets loja.<domain> when switching to multi)
- S1.3: done (the account is created first (members need its id) and removed if the shop cannot be saved; a half-made shop is closed and frees its address; platform pages (landing, sign-up, legal) use fixed Portuguese text instead of the per-shop text catalog; legal drafts in src/lib/platform/legal marked for a lawyer)
- S1.4: todo
- S1.5: done (manual_pix only (PSP adapter later); shop #1 never pays; first invoice on the 1st after the trial ends; due on the 10th; audit_log.shop_id may be null for platform-level entries)
- S1.6: todo
- S1.7: done (applied at sign-up (src/lib/server/presets/business-types.ts); shops.preset keeps the blank/deku looks)
- S2.1: todo
- S2.2: todo
- S2.3: todo
- S2.4: todo
- S2.5: todo
- S3.1: todo
- S3.2: todo
- S3.3: todo
- S3.4: todo
- S3.5: todo
- S3.6: todo
- S3.7: todo
- S3.8: todo
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
