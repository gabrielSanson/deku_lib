-- H3: remember what each order request contained, so a reused idempotency key with a
-- different cart is refused instead of silently returning the earlier order.
alter table orders add column if not exists request_hash text;
