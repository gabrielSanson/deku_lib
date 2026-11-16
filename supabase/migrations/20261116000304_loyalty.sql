-- S3.4: loyalty, referral and birthday coupons are issued once per milestone, whatever the retries.
create unique index coupons_cycle_key on public.coupons (shop_id, customer_id, cycle_key)
  where cycle_key is not null;
-- One shareable welcome coupon per customer who refers friends.
create unique index coupons_referral_welcome on public.coupons (shop_id, friend_ref)
  where kind = 'referral_welcome';
