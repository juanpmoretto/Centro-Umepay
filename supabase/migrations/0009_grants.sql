-- RLS policies restrict which ROWS a role can see/touch, but Postgres still
-- requires a base table-level GRANT before any policy is even evaluated.
-- These grants match the access boundaries already defined in
-- 0006_rls_policies.sql; without them every anon/authenticated query fails
-- with "permission denied" regardless of RLS.

grant usage on schema public to anon, authenticated;

grant select, insert on booking_requests to anon;
grant select, insert, update, delete on booking_requests to authenticated;

grant select on booking_calendar_events to anon, authenticated;

grant select on
  pricing_seasons,
  accommodation_types,
  accommodation_rates,
  meal_surcharge_tiers,
  discount_tiers_nights,
  discount_tiers_headcount,
  salon_thresholds,
  pricing_settings
to anon;

grant select, insert, update, delete on
  pricing_seasons,
  accommodation_types,
  accommodation_rates,
  meal_surcharge_tiers,
  discount_tiers_nights,
  discount_tiers_headcount,
  salon_thresholds,
  pricing_settings,
  pricing_sync_log,
  staff_profiles
to authenticated;

grant select, insert, update, delete on quotes to authenticated;

grant insert on quote_inquiries to anon;
grant select, insert, update, delete on quote_inquiries to authenticated;
