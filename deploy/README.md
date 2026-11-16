# Running the shop on your own server

Everything runs on one machine with Docker: the self-hosted Supabase stack
(database, staff logins, live updates, file storage), the shop's web app, its
background worker and a Caddy proxy that handles HTTPS. Nothing depends on a cloud host.

## What the machine needs

- Linux with Docker Engine and the Compose plugin (Ubuntu 24.04 LTS works well).
- 4 GB RAM and 2 CPU cores or more, plus 20 GB of disk.
- A way in from the internet. Customers order online and iFood calls the shop,
  so pick one of these:
  - **A public IP with ports 80 and 443 open** (a VPS, or a shop router with port
    forwarding). Point the domain's DNS `A` record at it, and Caddy gets the
    HTTPS certificate on its own.
  - **A Cloudflare Tunnel** (free) when the machine sits behind a normal shop
    internet connection with no open ports. See [below](#behind-a-cloudflare-tunnel).

## First install

```sh
git clone https://github.com/gabrielSanson/deku_lib.git && cd deku_lib
sh deploy/setup.sh pedido.dekuburger.com.br "Deku Burger" deku   # writes deploy/supabase/.env with fresh secrets
deploy/shop.sh up -d --build                                 # first start pulls ~2 GB of images
deploy/shop.sh exec shop-web node --import tsx scripts/create-owner.ts voce@email.com "Seu nome" 'uma-senha-forte'
```

Then open `https://<domain>/staff/login`, sign in as the owner, and follow the
setup wizard (store, menu, delivery, team, payments, iFood).

Keep `deploy/supabase/.env` safe. It holds the database password, the signing
keys and `APP_SECRET` (which encrypts the iFood secret, the NFC-e certificate and the
phone-alert keys saved in the app; losing it means entering them again), and it
is not in Git.

## Everyday commands

| Task                    | Command                                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status                  | `deploy/shop.sh ps`                                                                                                                                  |
| Logs                    | `deploy/shop.sh logs -f shop-web shop-worker`                                                                                                        |
| Update to a new version | `git pull && deploy/shop.sh up -d --build` (database migrations run on their own)                                                                    |
| Stop everything         | `deploy/shop.sh down` (data stays in `deploy/supabase/volumes/`)                                                                                     |
| Database console        | `deploy/shop.sh exec db psql -U postgres`                                                                                                            |
| Supabase Studio         | `ssh -L 8000:127.0.0.1:8000 <server>` then open http://localhost:8000 (user and password: `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` in the `.env`) |

The database and Studio are bound to `127.0.0.1` and are never exposed to the internet.

## Backups

The database is the only state that matters. The `shop-backup` service looks after it:

- Every night at 03:30 (São Paulo) it writes `backups/shop-<date>.dump` with `pg_dump`, copies the
  new dumps off the machine with [rclone](https://rclone.org) when `RCLONE_REMOTE` is set, and
  deletes local dumps older than `BACKUP_KEEP_DAYS` (default 14).
- Every Sunday at 04:00 it restores the newest dump into a scratch database, counts the orders
  and drops it again.
- Each run is recorded and shown in **Configurações → Sistema**, which turns red when the last good
  dump is more than 26 hours old.

**Copy off the machine (owner).** A backup that lives on the same disk is not a backup.

1. Create somewhere to keep the copies: a Backblaze B2 bucket, a Google Drive folder, an
   S3-compatible bucket, or anything else rclone supports.
2. Run `deploy/shop.sh run --rm shop-backup rclone config` and answer the questions. The answers are
   saved in `deploy/backup/rclone.conf` (git-ignored; see `rclone.conf.example`).
3. In `deploy/supabase/.env`, set `RCLONE_REMOTE=<remote>:<bucket or folder>` (for example
   `b2:minha-loja/banco`) and run `deploy/shop.sh up -d`.
4. Check it now instead of waiting for the night: `node tests/selfhost/backup-check.mjs` runs one
   dump and one restore test and checks both were recorded.

Also keep a copy of `deploy/supabase/.env` somewhere safe, and back up the uploaded menu photos in
`deploy/supabase/volumes/storage/` the same way.

**Restore:** on a fresh install, run `setup.sh`, then copy the old `.env` over the new one. Run
`deploy/shop.sh up -d`, then
`deploy/shop.sh exec -T db pg_restore -U postgres -d postgres --clean --if-exists < backups/<file>.dump`.

## Behind a Cloudflare Tunnel

1. In the Cloudflare dashboard, open Zero Trust → Networks → Tunnels and create a
   tunnel. Copy its token.
2. Add a public hostname `pedido.example.com` pointing to `http://shop-proxy:80`.
3. In `deploy/supabase/.env`, set `SHOP_DOMAIN=pedido.example.com` and add `TUNNEL_TOKEN=<token>`.
4. Start with the tunnel override:
   `deploy/shop.sh -f ../compose.tunnel.yml up -d --build`.

Cloudflare then handles HTTPS. Caddy serves plain HTTP inside the machine, and
no ports need to be opened on the router.

## Alerts

The `shop-watchdog` service checks every minute that the worker is alive, that iFood answers
(when it is on), that last night's backup worked and that orders are arriving at hours that are
normally busy. When something stops it opens an alert on the staff home and in
**Configurações → Sistema**, sends an e-mail and a push to the admins' devices, repeats it every
30 minutes and says when it is fixed.

- **E-mail:** set `SMTP_URL` in `deploy/supabase/.env`, e.g.
  `SMTP_URL=smtps://loja%40gmail.com:<app password>@smtp.gmail.com:465` (create an app password in
  the Google account; `@` in the user becomes `%40`). `ALERT_FROM` is optional. Then add the
  addresses in Configurações → Sistema.
- **Push:** in Configurações → Sistema, tap "Receber alertas neste aparelho" on each phone that
  should get them.
- Use "Enviar alerta de teste" on the same page to check both.

## The customer's address (rate limits)

Checkout, login and the order-ready alerts limit how often one customer can try. The app sits
behind Caddy, so it must be told which header carries the customer's address, or every customer
would share one limit. `compose.shop.yml` sets `ADDRESS_HEADER=X-Forwarded-For` and `XFF_DEPTH=1`
(Caddy adds the address it sees), and `compose.tunnel.yml` switches to `CF-Connecting-IP`, the
header Cloudflare sets. Change them in `deploy/supabase/.env` only if you put another proxy in
front. When the setting is wrong the web log says `rate limit sees a private address; set
ADDRESS_HEADER`.

## Várias lojas (hosted platform)

One install can serve many shops, each at its own address. A private single-shop install needs
none of this: `TENANCY` stays `single` and everything works as before.

1. DNS **[owner]**: point the platform domain (for example `dekulib.com.br`) and a wildcard record
   `*.dekulib.com.br` at the server. A shop that wants its own domain adds a CNAME to
   `<slug>.dekulib.com.br`.
2. `.env`: `TENANCY=multi`, `PLATFORM_DOMAIN=dekulib.com.br`, `SHOP_DOMAIN=dekulib.com.br` and
   `CADDYFILE=../Caddyfile.multi`. Caddy then gets a certificate for each shop host on its first
   visit, after asking the app (`/api/v1/tls-ask`) that the host belongs to a shop.
3. `./shop.sh up`. The existing shop becomes shop #1 (`loja.<domain>`); its data is untouched.
4. Payment and iFood webhooks name the shop: `/api/v1/payments/webhooks/mercadopago/<shop id>` and
   `/api/v1/integrations/ifood/webhook/<shop id>` (Configurações → Pagamentos shows the exact URL).
   The old URLs without a shop keep working for shop #1.
5. Platform admin: `./shop.sh exec shop-web node --import tsx scripts/create-platform-admin.ts <email> [password]`,
   then sign in at `https://<platform domain>/plataforma`. The console lists every shop and can suspend,
   reactivate, extend a trial, mark an invoice paid and open a shop's staff screens read-only for 30
   minutes ("Ver como a loja"; every page seen is recorded in the shop's audit log).

Postgres keeps shops apart: the app reaches a shop's rows as role `app_server` with the shop set,
and row-level security hides every other shop's rows.

## Upgrading Supabase

`deploy/supabase/` is an unmodified copy of Supabase's official self-hosting
files (see `UPSTREAM.md`). To upgrade, replace the folder with a newer copy, read
its `CHANGELOG.md`, and run `deploy/shop.sh up -d`.
