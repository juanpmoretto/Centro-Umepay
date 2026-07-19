-- Adds three cost drivers found in the master spreadsheet that were missing
-- from the first pass of calculateQuote():
--   1. Nodriza salon carries a flat discount vs. Nave (whose cost is already
--      folded into the per-person accommodation rates).
--   2. Extra standalone meals beyond the 4/day included in the base rate.
--   3. A free-form staff-entered manual adjustment for case-by-case
--      exceptions seen in the sheet (minimum billable headcount, free
--      facilitator lodging, weekday-only discounts) that are negotiated
--      per event rather than systematic rules.

alter table salon_thresholds add column flat_adjustment numeric(12, 2) not null default 0;
update salon_thresholds set flat_adjustment = -250000 where salon_code = 'nodriza';

alter table pricing_settings add column extra_meal_price numeric(12, 2) not null default 24485;

-- The quote's price is no longer manually typed by staff -- it's always the
-- output of calculateQuote(), so the column is renamed to reflect that.
alter table quotes rename column staff_quoted_total to calculated_total;

alter table quotes add column extra_meals_count int not null default 0;
alter table quotes add column manual_adjustment_amount numeric(12, 2) not null default 0;
alter table quotes add column manual_adjustment_note text;

alter table quote_inquiries add column adjusted_extra_meals_count int not null default 0;

-- sync_pricing_config() (0007) needs to carry the two new synced fields
-- through the Sheets sync too, so a real staff edit to Tarifas_App keeps
-- these in step with everything else.
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

  insert into pricing_seasons (name, start_date, end_date, sort_order)
  select
    (s->>'season_name'),
    (s->>'start_date')::date,
    (s->>'end_date')::date,
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

  insert into accommodation_rates (season_id, accommodation_type_id, price_per_person_per_night)
  select
    ps.id,
    at.id,
    (r->>'price_per_person_per_night')::numeric
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
    synced_at = now();

  return rows_synced;
end;
$$;
