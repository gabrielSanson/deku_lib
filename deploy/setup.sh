#!/bin/sh
# First-time setup on the shop's server. Creates deploy/supabase/.env with fresh
# secrets and the shop's domain. Run once; it refuses to overwrite an existing .env.
#   sh deploy/setup.sh pedido.example.com "Minha loja"          # blank look
#   sh deploy/setup.sh pedido.dekuburger.com.br "Deku Burger" deku
set -e
DOMAIN="$1"
NAME="${2:-}"
PRESET="${3:-blank}"
[ -n "$DOMAIN" ] || { echo "Usage: sh deploy/setup.sh <domain> [shop name] [blank|deku]"; exit 1; }
cd "$(dirname "$0")/supabase"
[ ! -f .env ] || { echo "deploy/supabase/.env already exists; not overwriting it."; exit 1; }

cp .env.example .env
sh utils/generate-keys.sh --update-env >/dev/null
rm -f .env.old

URL="https://$DOMAIN"
sed -i \
  -e "s|^SUPABASE_PUBLIC_URL=.*$|SUPABASE_PUBLIC_URL=$URL|" \
  -e "s|^API_EXTERNAL_URL=.*$|API_EXTERNAL_URL=$URL/auth/v1|" \
  -e "s|^SITE_URL=.*$|SITE_URL=$URL|" \
  -e "s|^DISABLE_SIGNUP=.*$|DISABLE_SIGNUP=true|" \
  -e "s|^ENABLE_PHONE_SIGNUP=.*$|ENABLE_PHONE_SIGNUP=false|" \
  -e "s|^ENABLE_ANONYMOUS_USERS=.*$|ENABLE_ANONYMOUS_USERS=false|" \
  .env

cat >> .env <<ENV

############
# Shop (deploy/compose.shop.yml)
############
SHOP_DOMAIN=$DOMAIN
SHOP_NAME=$NAME
# Built-in look and wording: blank (no brand) or deku (Deku Burger). See README.
SHOP_PRESET=$PRESET
# Encrypts secrets saved in the app (the iFood client secret). Keep it with the backups:
# without it, saved secrets must be typed in again.
APP_SECRET=$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')
PAYMENT_PROVIDER=none
ENV
chmod 600 .env
echo "Wrote deploy/supabase/.env for $URL."
echo "Next: deploy/shop.sh up -d --build, then deploy/shop.sh exec shop-web node --import tsx scripts/create-owner.ts"
