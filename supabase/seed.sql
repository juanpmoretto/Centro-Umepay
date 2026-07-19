-- Real pricing data, extracted directly from the master "cotizador" tab's
-- actual cell formulas (not just its displayed values) in the Centro Umepay
-- Google Sheet. See supabase/migrations/0012_real_formula_fix.sql for the
-- full derivation notes.
--
-- Known simplification: these are the master template's "current" rates,
-- used as a single flat season. Real seasonal variation is confirmed to
-- exist (spot-checked against the SEP-OCT26 tab, whose per-unit rates
-- differ meaningfully from this master template) -- extract per-month rates
-- or wire up the Phase 3 Google Sheets sync (supabase/functions/sync-pricing)
-- for full seasonal accuracy.

insert into pricing_seasons (name, start_date, end_date, sort_order) values
  ('Temporada actual', '2020-01-01', '2035-12-31', 1);

-- Each row is a specific occupancy configuration with a FIXED capacity
-- (min_capacity = max_capacity) -- e.g. a "cuádruple" cabin is a distinct
-- selectable line from a "doble", not the same room priced per head.
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

-- combined_rate_per_night: TOTAL per night for the whole unit at that
-- occupancy, already including its base vegetarian food (confirmed via the
-- real formula: lodging + food, where food scales linearly with occupancy
-- but lodging does not -- a "cuádruple" isn't 4x an "individual").
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

insert into meal_surcharge_tiers (code, label, protein_tier, surcharge_per_person_total, sort_order) values
  ('lunch_only', 'Solo almuerzo con carne (Item 200g)', 'item_200g', 8000, 1),
  ('lunch_only', 'Solo almuerzo con carne (Premium 400g)', 'premium_400g', 12000, 2),
  ('lunch_dinner', 'Almuerzo y cena con carne (Item 200g)', 'item_200g', 14000, 3),
  ('lunch_dinner', 'Almuerzo y cena con carne (Premium 400g)', 'premium_400g', 20000, 4),
  ('full', 'Todas las comidas con carne (Item 200g)', 'item_200g', 22000, 5),
  ('full', 'Todas las comidas con carne (Premium 400g)', 'premium_400g', 32000, 6);

insert into discount_tiers_nights (min_nights, max_nights, discount_pct) values
  (1, 2, 0),
  (3, 4, 10),
  (5, 10, 20),
  (11, null, 30);

insert into discount_tiers_headcount (min_people, discount_pct) values
  (16, 3),
  (26, 6),
  (41, 10);

-- flat_adjustment: Nave's salon usage is already covered by the fixed
-- salon_per_day/logistics_flat costs below (charged on every quote).
-- Nodriza gets a flat discount off the retreat's final total (confirmed by
-- Umepay staff, matches the "DESCUENTO por uso de salon Nodriza" line found
-- in several real per-event budget tabs).
insert into salon_thresholds (salon_code, label, min_people, max_people, long_weekend_min_nights, long_weekend_min_people, flat_adjustment) values
  ('nave', 'Nave', 16, null, 3, 20, 0),
  ('nodriza', 'Nodriza', 8, 14, null, null, -250000);

-- salon_per_day and logistics_flat are real, confirmed values (B43/E43 in
-- the master tab): salon usage is charged per night, logistics is a single
-- fixed fee for the whole stay regardless of length.
insert into pricing_settings (id, iva_pct, deposit_pct, extra_meal_price, salon_per_day, logistics_flat) values
  (true, 21, 30, 24485.2, 58557.23, 50017.95);
