-- All public/staff access boundaries in one place.
--
-- Public (anon) can:
--   - insert a booking_requests row (submit the reservation form)
--   - read booking_calendar_events (dates + status only, no PII -- see 0002)
--   - read all pricing config tables (needed so the quote explorer can
--     recalculate live, client-side, without a staff session)
--   - look up exactly one quote via get_quote_by_slug(slug) -- never a raw
--     SELECT on `quotes`, to avoid enumeration
--   - insert a quote_inquiries row (send an adjusted exploration to staff)
--
-- Everything else (booking status changes, pricing writes, quote creation,
-- reading quotes/inquiries in bulk) requires an authenticated staff session.

alter table booking_requests enable row level security;
alter table quotes enable row level security;
alter table quote_inquiries enable row level security;
alter table pricing_seasons enable row level security;
alter table accommodation_types enable row level security;
alter table accommodation_rates enable row level security;
alter table meal_surcharge_tiers enable row level security;
alter table discount_tiers_nights enable row level security;
alter table discount_tiers_headcount enable row level security;
alter table salon_thresholds enable row level security;
alter table pricing_settings enable row level security;
alter table pricing_sync_log enable row level security;

-- booking_requests: public can only insert; all reads/updates are staff-only
-- (the public calendar reads booking_calendar_events instead, see 0002).
create policy "public can submit booking requests"
  on booking_requests for insert
  to anon
  with check (true);

create policy "staff full access to booking requests"
  on booking_requests for all
  to authenticated
  using (true)
  with check (true);

-- booking_calendar_events: public read-only, staff never writes directly
-- (it's only ever written by the sync_calendar_event() trigger).
create policy "public read booking calendar events"
  on booking_calendar_events for select
  to anon
  using (true);

create policy "staff read booking calendar events"
  on booking_calendar_events for select
  to authenticated
  using (true);

-- pricing config: public read (quote explorer needs it unauthenticated),
-- staff-only write (in practice only ever written by the sync-pricing
-- Edge Function using the service-role key, which bypasses RLS entirely --
-- these "staff write" policies exist for the Phase-2 manual-seed workflow
-- and any future manual override from the staff UI).
create policy "public read seasons" on pricing_seasons for select to anon using (true);
create policy "staff write seasons" on pricing_seasons for all to authenticated using (true) with check (true);

create policy "public read accommodation types" on accommodation_types for select to anon using (true);
create policy "staff write accommodation types" on accommodation_types for all to authenticated using (true) with check (true);

create policy "public read accommodation rates" on accommodation_rates for select to anon using (true);
create policy "staff write accommodation rates" on accommodation_rates for all to authenticated using (true) with check (true);

create policy "public read meal tiers" on meal_surcharge_tiers for select to anon using (true);
create policy "staff write meal tiers" on meal_surcharge_tiers for all to authenticated using (true) with check (true);

create policy "public read nights discounts" on discount_tiers_nights for select to anon using (true);
create policy "staff write nights discounts" on discount_tiers_nights for all to authenticated using (true) with check (true);

create policy "public read headcount discounts" on discount_tiers_headcount for select to anon using (true);
create policy "staff write headcount discounts" on discount_tiers_headcount for all to authenticated using (true) with check (true);

create policy "public read salon thresholds" on salon_thresholds for select to anon using (true);
create policy "staff write salon thresholds" on salon_thresholds for all to authenticated using (true) with check (true);

create policy "public read pricing settings" on pricing_settings for select to anon using (true);
create policy "staff write pricing settings" on pricing_settings for all to authenticated using (true) with check (true);

create policy "staff only sync log" on pricing_sync_log for all to authenticated using (true) with check (true);

-- quotes: locked to staff entirely; anon access is only through the
-- security-definer get_quote_by_slug() RPC (see 0004_quotes.sql).
create policy "staff manage quotes" on quotes for all to authenticated using (true) with check (true);
grant execute on function get_quote_by_slug(text) to anon;

-- quote_inquiries: public can create (the "send to team" button), staff can
-- read/update (mark reviewed). Public cannot read inquiries back.
create policy "public can submit quote inquiries"
  on quote_inquiries for insert
  to anon
  with check (true);

create policy "staff can read quote inquiries"
  on quote_inquiries for select
  to authenticated
  using (true);

create policy "staff can update quote inquiries"
  on quote_inquiries for update
  to authenticated
  using (true)
  with check (true);
