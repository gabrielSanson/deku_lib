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

The database is the only state that matters.

- Nightly dump (add to `crontab -e`):

  ```sh
  0 3 * * * cd /path/to/deku_lib && deploy/shop.sh exec -T db pg_dump -U postgres -Fc postgres > backups/shop-$(date +\%F).dump
  ```

- Copy `backups/` and `deploy/supabase/.env` off the machine, to another disk or
  cloud storage. A backup that lives on the same disk is not a backup.
- Uploaded menu photos are in `deploy/supabase/volumes/storage/`. Back them up the same way.
- **Restore:** on a fresh install, run `setup.sh`, then copy the old `.env` over
  the new one. Run `deploy/shop.sh up -d`, then
  `deploy/shop.sh exec -T db pg_restore -U postgres -d postgres --clean --if-exists < backups/<file>.dump`.
  Practise this once before opening.

## Behind a Cloudflare Tunnel

Set `ADDRESS_HEADER=CF-Connecting-IP` in `deploy/supabase/.env` so rate limits see each customer's address (Caddy alone uses `X-Forwarded-For`, the default).

1. In the Cloudflare dashboard, open Zero Trust → Networks → Tunnels and create a
   tunnel. Copy its token.
2. Add a public hostname `pedido.example.com` pointing to `http://shop-proxy:80`.
3. In `deploy/supabase/.env`, set `SHOP_DOMAIN=pedido.example.com` and add `TUNNEL_TOKEN=<token>`.
4. Start with the tunnel override:
   `deploy/shop.sh -f ../compose.tunnel.yml up -d --build`.

Cloudflare then handles HTTPS. Caddy serves plain HTTP inside the machine, and
no ports need to be opened on the router.

## Upgrading Supabase

`deploy/supabase/` is an unmodified copy of Supabase's official self-hosting
files (see `UPSTREAM.md`). To upgrade, replace the folder with a newer copy, read
its `CHANGELOG.md`, and run `deploy/shop.sh up -d`.
