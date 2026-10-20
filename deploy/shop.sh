#!/bin/sh
# Runs docker compose for the whole stack: self-hosted Supabase + the shop.
#   deploy/shop.sh up -d --build     start or update everything
#   deploy/shop.sh ps                status
#   deploy/shop.sh logs -f shop-web  follow the web app's logs
#   deploy/shop.sh down              stop (data stays in deploy/supabase/volumes)
set -e
cd "$(dirname "$0")/supabase"
[ -f .env ] || { echo "deploy/supabase/.env is missing. Run deploy/setup.sh first."; exit 1; }
exec docker compose -f docker-compose.yml -f ../compose.shop.yml "$@"
