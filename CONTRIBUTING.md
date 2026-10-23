# Working on the shop

Short notes for anyone changing the code. The README covers setup, environment variables and
deploys; this page covers where things go and how to check a change before pushing.

## Pushing

Work goes straight to `main` (no pull requests). Before every push run:

```sh
pnpm verify    # svelte-check, prettier + eslint, unit tests, database tests
```

The database tests need `TEST_DATABASE_URL` (see below). If the change touches a screen, also run
the browser tests. CI runs the same checks after each push to `main` and the browser tests every
night, but it does not block a push: if it goes red, fix forward right away.

## Words on screen

Every word a customer or the staff reads comes from the text catalog in `src/lib/texts/`, so the
owner can change it in Configurações → Textos do site.

- `catalog.ts` holds the customer side; `staff-ops.ts`, `staff-settings.ts`, `staff-menu.ts`,
  `staff-campaigns.ts` and `staff-labels.ts` hold the staff screens; `server-errors.ts` holds the
  messages the server sends back. A test fails if a key is in two modules.
- Add a key with a `group`, a short `label` (what the owner sees in the editor) and the `default`.
  Words in `{braces}` are filled in by the code and the owner must keep them.
- In a component: `const t = useTexts();` then `t('key', { name })`. Shared labels (order types,
  payment methods, states, weekdays) come from `useLabels()`.
- On the server, refuse with a key, never a sentence:
  - in a service, `throw new DomainError('err.cash.overdraw', { code: 'overdraw', status: 409 })`;
    `attempt()` in the form action turns it into the owner's wording;
  - in a form action, `return failText(400, 'err.amount.required')`, and
    `{ ok: await shopText('ok.categorySaved') }` for a confirmation.
  - Pass `{ text }` only for words that are already final, such as the owner's own pause reason.
- Known exceptions: the "Sem {name}" line on a ticket (it is stored on the order and the kitchen
  ticket looks for it) and the iFood setup diagnostics, which are saved with the check result.

## Components

Screens are built from `src/lib/components` (atoms → molecules → organisms). Use these instead of
writing raw markup:

| Need                                 | Use                                                  |
| ------------------------------------ | ---------------------------------------------------- |
| Text, number, date or time input     | `TextField` (`hideLabel` in tight rows, `icon`)      |
| Select / multi-line text / photo     | `SelectField`, `TextArea`, `FileField`               |
| Password with show/hide              | `PasswordField`                                      |
| Yes/no choice                        | `Checkbox`                                           |
| Exclusive button row                 | `ChoiceButtons`                                      |
| Coupon code with Apply/Remove        | `CouponField`                                        |
| Search box                           | `SearchField`                                        |
| Editor form with the unsaved warning | `GuardedForm`                                        |
| Button that posts after a confirm    | `ConfirmedPost` (never the browser's `confirm()`)    |
| Money, dates, times                  | `Money`, `formatBRL`, `formatTime`, `formatDateTime` |
| Empty list, error under a form       | `EmptyState`, `FormError`                            |

Every field needs a label. When the design has no room for one, keep it for screen readers with
`hideLabel` instead of leaving only a placeholder. Fields inside a loop need a unique `id`.

## Tests

| Command                 | What it covers                                      | Needs                                    |
| ----------------------- | --------------------------------------------------- | ---------------------------------------- |
| `pnpm test`             | domain rules, catalog, mappings                     | nothing                                  |
| `pnpm test:integration` | orders, payments, drawer, iFood, texts… on Postgres | `TEST_DATABASE_URL`                      |
| `pnpm test:e2e`         | the site and the staff screens in Chromium          | local Supabase, seed, dev server, worker |

**Database tests.** Any Postgres 16 works; the tests drop and recreate the database each run:

```sh
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/burger_test pnpm test:integration
```

**Browser tests.** They need the local Supabase (Docker), because staff sign in through it:

```sh
pnpm exec supabase start -x studio,imgproxy,vector,logflare,supavisor,edge-runtime,inbucket,storage-api,postgres-meta
# .env: DATABASE_URL, PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY from
# `supabase status`, PAYMENT_PROVIDER=local_stub, an APP_SECRET of 32+ characters and
# SHOP_PRESET=deku (the tests order from Deku's sample menu; the default seeds one product)
pnpm seed
pnpm worker &          # orders reach the kitchen through the worker
pnpm test:e2e          # starts the dev server itself
```

In a container without a Playwright browser download, set `PW_CHROMIUM_PATH` to a Chromium binary.
The staff tests open the cash drawer themselves, so they also pass against a database that earlier
runs have used.

## Database

New migrations go in `supabase/migrations/<timestamp>_<name>.sql`. Migrations only add things;
never edit one that has already been applied. Money is integer centavos and every "day" is a São
Paulo day; keep both rules in new code.
