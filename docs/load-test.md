# Peak-hour load test (S5.12)

Script: [`tests/load/peak.js`](../tests/load/peak.js) for [k6](https://k6.io). k6 is AGPL: run it as a tool,
never add it as a project dependency. **Run it against a local stack only, never production.**

## Target

200 web orders per hour per shop for 5 shops (1,000 orders/hour) for 30 minutes, plus three staff screens per
shop polling the order board every 5 s. Pass when:

- p95 of the checkout request < 800 ms
- error rate < 0.5 %
- no background job waits more than 1 minute (pg-boss backlog)

## Result, 2026-11-17 (commit after S5.11): pass

| Measure                        | Result                                | Target       |
| ------------------------------ | ------------------------------------- | ------------ |
| Orders placed                  | 511 in 30 min (0.28/s)                | 500          |
| Checkout p95                   | 49.7 ms (median 21.4 ms, max 101 ms)  | < 800 ms     |
| All requests p95               | 50.3 ms over 6,392 requests           | —            |
| Failed checkouts               | 0 of 511                              | < 0.5 %      |
| Failed requests                | 0 of 6,392                            | < 0.5 %      |
| Staff board loads              | 5,370, all returned data              | —            |
| Job backlog                    | 0 jobs overdue at every minute sample | none > 1 min |
| Errors recorded (error_events) | 0                                     | —            |

Setup: one cloud container running everything (Supabase local stack in Docker, the production build with
`node build`, the worker). The five shops were simulated by sending all five shops' traffic to the one local shop
(`BASE_URLS` listed it five times), so the database saw the full 1,000 orders/hour and 15 polling screens.
Orders were pickup with Pix to the shop key, so no payment provider was called. This is a lower bound on a
real server's headroom: the same machine also ran k6 and Postgres.

Not covered: Supabase Realtime fan-out to many screens, payment provider latency, iFood/WhatsApp webhooks,
NFC-e emission (all external or disabled locally).

## How to run it again

```bash
supabase start && supabase db reset && pnpm seed
# The shop needs a Pix key (Configurações → Pagamentos) or:
psql "$DATABASE_URL" -c "update store_profile set pix_enabled = true, pix_key = 'loja@exemplo.com.br', pix_merchant_name = 'Loja Teste', pix_merchant_city = 'Sao Paulo'"
ORIGIN=http://localhost:3000 pnpm build
# No PAYMENT_PROVIDER=local_stub in production mode; ADDRESS_HEADER lets each simulated customer have its own
# address, so the per-address checkout limit (10 per 10 min) applies per customer as in real life.
NODE_ENV=production ADDRESS_HEADER=x-forwarded-for ORIGIN=http://localhost:3000 PORT=3000 node build &
pnpm worker &
# A staff session cookie for the board polling: sign in at http://localhost:3000/staff/login and copy the
# cookie header from the browser's developer tools.
B=http://localhost:3000
k6 run -e BASE_URLS=$B,$B,$B,$B,$B -e ORDERS_PER_HOUR=200 -e DURATION=30m -e STAFF_COOKIE="..." tests/load/peak.js
# Job backlog while it runs (should stay 0):
psql "$DATABASE_URL" -c "select count(*) from pgboss.job where state in ('created','retry') and start_after < now() - interval '1 minute'"
```

For a real multi-shop test, put each shop's own URL in `BASE_URLS`.
