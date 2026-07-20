-- Corrects the pricing formula again, this time verified peso-for-peso
-- against a controlled test the user ran in parallel on both the app and
-- a real monthly tab (JUL-AGO26). The previous version was still modeled on
-- the generic "cotizador" master template, which turns out to be an OLD
-- template -- the 10 real monthly tabs (JULIO-AGOSTO..ENE-FEB27) that staff
-- actually use to quote clients compute things differently:
--
-- 1. IVA (21%) is applied PER ACCOMMODATION LINE (units * rate * nights *
--    1.21), not as a single 50%-of-subtotal step at the end.
-- 2. There is no separate "logística" fee in these real tabs (only in the
--    old master template) -- dropped entirely.
-- 3. Salon cost is added once per DISTINCT accommodation line with a
--    nonzero quantity (salon_per_day * nights / totalPeople each) -- an
--    unusual quirk, but it's what reproduces the real numbers exactly.
-- 4. The final total is NOT split 50/50 -- it's 30% seña (no further
--    adjustment) + 70% paid in cash with a 20% discount:
--      total = subtotal * (deposit_pct/100 + (1-deposit_pct/100)*(1-cash_discount_pct/100))
--            = subtotal * 0.86 with the confirmed 30%/20% defaults.
-- 5. Nights discount tiers differ slightly from the master template too;
--    using the more complete 3-tier schedule found in SEP-OCT26 (the
--    tiers are NOT perfectly consistent across all 10 monthly tabs --
--    flagged for staff to standardize whenever the Sheets sync is wired up).

alter table pricing_settings drop column logistics_flat;
alter table pricing_settings add column cash_discount_pct numeric(5, 2) not null default 20;

delete from discount_tiers_nights;
insert into discount_tiers_nights (min_nights, max_nights, discount_pct) values
  (1, 2, 0),
  (3, 4, 3),
  (5, 9, 5),
  (10, null, 10);

-- sync_pricing_config() needs logistics_flat dropped and cash_discount_pct added.
create or replace function sync_pricing_config(payload jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  rows_synced int := 0;
begin
  delete from accommodation_rates;
  delete from pricing_seasons;
  delete from accommodation_types;
  delete from meal_surcharge_tiers;
  delete from discount_tiers_nights;
  delete from discount_tiers_headcount;
  delete from salon_thresholds;

  insert into pricing_seasons (name, start_date, end_date, salon_per_day, sort_order)
  select
    (s->>'season_name'),
    (s->>'start_date')::date,
    (s->>'end_date')::date,
    (s->>'salon_per_day')::numeric,
    row_number() over ()
  from jsonb_array_elements(payload->'seasons') as s;
  get diagnostics rows_synced = row_count;

  insert into accommodation_types (code, label, min_capacity, max_capacity, total_units, bathroom_type, sort_order)
  select
    (a->>'code'),
    (a->>'label'),
    (a->>'min_capacity')::int,
    (a->>'max_capacity')::int,
    (a->>'total_units')::int,
    (a->>'bathroom_type'),
    row_number() over ()
  from jsonb_array_elements(payload->'accommodationTypes') as a;
  rows_synced := rows_synced + (select count(*) from accommodation_types);

  insert into accommodation_rates (season_id, accommodation_type_id, combined_rate_per_night)
  select
    ps.id,
    at.id,
    (r->>'combined_rate_per_night')::numeric
  from jsonb_array_elements(payload->'rates') as r
  join pricing_seasons ps on ps.name = r->>'season_name'
  join accommodation_types at on at.code = r->>'accommodation_code';
  rows_synced := rows_synced + (select count(*) from accommodation_rates);

  insert into meal_surcharge_tiers (code, label, protein_tier, surcharge_per_person_total, sort_order)
  select
    (m->>'code'),
    (m->>'label'),
    (m->>'protein_tier'),
    (m->>'surcharge_per_person_total')::numeric,
    row_number() over ()
  from jsonb_array_elements(payload->'mealTiers') as m;
  rows_synced := rows_synced + (select count(*) from meal_surcharge_tiers);

  insert into discount_tiers_nights (min_nights, max_nights, discount_pct)
  select
    (n->>'min_nights')::int,
    nullif(n->>'max_nights', 'null')::int,
    (n->>'discount_pct')::numeric
  from jsonb_array_elements(payload->'nightsDiscounts') as n;
  rows_synced := rows_synced + (select count(*) from discount_tiers_nights);

  insert into discount_tiers_headcount (min_people, discount_pct)
  select
    (h->>'min_people')::int,
    (h->>'discount_pct')::numeric
  from jsonb_array_elements(payload->'headcountDiscounts') as h;
  rows_synced := rows_synced + (select count(*) from discount_tiers_headcount);

  insert into salon_thresholds (salon_code, label, min_people, max_people, long_weekend_min_nights, long_weekend_min_people, flat_adjustment)
  select
    (s->>'salon_code'),
    (s->>'label'),
    (s->>'min_people')::int,
    nullif(s->>'max_people', 'null')::int,
    nullif(s->>'long_weekend_min_nights', 'null')::int,
    nullif(s->>'long_weekend_min_people', 'null')::int,
    coalesce((s->>'flat_adjustment')::numeric, 0)
  from jsonb_array_elements(payload->'salonThresholds') as s;
  rows_synced := rows_synced + (select count(*) from salon_thresholds);

  update pricing_settings
  set
    iva_pct = coalesce((payload->'globalSettings'->>'iva_pct')::numeric, iva_pct),
    deposit_pct = coalesce((payload->'globalSettings'->>'deposit_pct')::numeric, deposit_pct),
    extra_meal_price = coalesce((payload->'globalSettings'->>'extra_meal_price')::numeric, extra_meal_price),
    cash_discount_pct = coalesce((payload->'globalSettings'->>'cash_discount_pct')::numeric, cash_discount_pct),
    synced_at = now();

  return rows_synced;
end;
$$;
