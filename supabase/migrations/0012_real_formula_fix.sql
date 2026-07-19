-- Corrects three structural bugs found by diffing the app's formula against
-- the real master "cotizador" spreadsheet's actual cell formulas (not just
-- its displayed values, which is all the first extraction pass had access
-- to):
--
-- 1. Accommodation is priced per whole UNIT/configuration (e.g. "cabaña con
--    baño interior, cuádruple" has one combined price for the whole cabin),
--    not a flat per-person rate multiplied by headcount. Each occupancy
--    tier of a room type is its own row with a fixed capacity and its own
--    non-linear total rate -- a "doble" isn't 2x an "individual".
-- 2. Salon usage ($58,557.225/día) and "apoyo difusión y logística"
--    ($50,017.95, once per stay, not per night) are fixed costs present on
--    EVERY quote -- the first pass omitted them entirely.
-- 3. The nights discount and the headcount discount combine MULTIPLICATIVELY
--    (sequential, e.g. subtotal * 0.9 * 0.97), not additively (subtotal *
--    (1 - 0.10 - 0.03)). This only changes calculateQuote.ts, not the schema.
--
-- The combined per-night rate below already includes the base vegetarian
-- food for that configuration's occupancy (confirmed via the real formula:
-- F48 = lodging(C48) + food(E48), where E scales linearly with headcount but
-- lodging does not) -- there is no separate "food already included" toggle
-- needed, it's baked into this one number per accommodation config.

alter table accommodation_rates rename column price_per_person_per_night to combined_rate_per_night;

alter table pricing_settings add column salon_per_day numeric(12, 2) not null default 58557.23;
alter table pricing_settings add column logistics_flat numeric(12, 2) not null default 50017.95;

-- Replace the placeholder accommodation catalogue and the placeholder
-- 3-season split with real configurations (one row per fixed occupancy
-- tier) and their real combined per-night rates, taken directly from the
-- master "cotizador" tab. Deleting seasons cascades to accommodation_rates.
delete from pricing_seasons;
delete from accommodation_types;

insert into accommodation_types (code, label, min_capacity, max_capacity, total_units, bathroom_type, sort_order) values
  ('carpa', 'Carpa', 1, 1, 10, 'exterior', 1),
  ('trailer_x1', 'Trailer individual', 1, 1, 8, 'exterior', 2),
  ('trailer_x2', 'Trailer doble', 2, 2, 8, 'exterior', 3),
  ('cabint_individual', 'Cabaña con baño interior · individual', 1, 1, 5, 'interior', 4),
  ('cabint_doble', 'Cabaña con baño interior · doble', 2, 2, 5, 'interior', 5),
  ('cabint_triple', 'Cabaña con baño interior · triple', 3, 3, 5, 'interior', 6),
  ('cabint_cuadruple', 'Cabaña con baño interior · cuádruple', 4, 4, 5, 'interior', 7),
  ('cabext_individual', 'Cabaña con baño exterior · individual', 1, 1, 3, 'exterior', 8),
  ('cabext_doble', 'Cabaña con baño exterior · doble', 2, 2, 3, 'exterior', 9),
  ('cabext_triple', 'Cabaña con baño exterior · triple', 3, 3, 3, 'exterior', 10),
  ('cabext_cuadruple', 'Cabaña con baño exterior · cuádruple', 4, 4, 3, 'exterior', 11),
  ('cabext_quintuple', 'Cabaña con baño exterior · quíntuple', 5, 5, 3, 'exterior', 12),
  ('cabext_sextuple', 'Cabaña con baño exterior · séxtuple', 6, 6, 3, 'exterior', 13);

-- Single "current" season using the master template's live rates. Real
-- seasonal variation is confirmed to exist (spot-checked against the
-- SEP-OCT26 tab, whose per-unit rates differ meaningfully from this master
-- template) -- treat this as one flat default until per-month rates are
-- extracted or the Tarifas_App sync is wired up.
insert into pricing_seasons (name, start_date, end_date, sort_order)
values ('Temporada actual', '2020-01-01', '2035-12-31', 1);

insert into accommodation_rates (season_id, accommodation_type_id, combined_rate_per_night)
select s.id, t.id, v.rate
from (values
  ('carpa', 70660.35),
  ('trailer_x1', 107758.88),
  ('trailer_x2', 169464.41),
  ('cabint_individual', 242081.12),
  ('cabint_doble', 307624.44),
  ('cabint_triple', 373167.75),
  ('cabint_cuadruple', 438711.07),
  ('cabext_individual', 186159.21),
  ('cabext_doble', 250057.76),
  ('cabext_triple', 311763.30),
  ('cabext_cuadruple', 373468.83),
  ('cabext_quintuple', 435174.37),
  ('cabext_sextuple', 496879.90)
) as v(code, rate)
join accommodation_types t on t.code = v.code
join pricing_seasons s on s.name = 'Temporada actual';

update pricing_settings set salon_per_day = 58557.23, logistics_flat = 50017.95;

-- sync_pricing_config() (0007, last replaced in 0011) needs to follow the
-- renamed column and the two new global settings.
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
    salon_per_day = coalesce((payload->'globalSettings'->>'salon_per_day')::numeric, salon_per_day),
    logistics_flat = coalesce((payload->'globalSettings'->>'logistics_flat')::numeric, logistics_flat),
    synced_at = now();

  return rows_synced;
end;
$$;
