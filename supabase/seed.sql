-- Real pricing data, extracted directly from the master Google Sheet's
-- actual cell formulas (not just displayed values). Covers all 10 real
-- bimonthly pricing periods found in the sheet (Jul 2025 through Feb 2027) --
-- Centro Umepay re-prices roughly every two months to track inflation, this
-- is not a summer/winter seasonal split. See supabase/migrations/
-- 0012_real_formula_fix.sql, 0013_seasonal_rates.sql and
-- 0014_verified_real_formula.sql for full derivation notes.
--
-- The rates below (per season, per accommodation config) are unaffected by
-- 0014 -- only the formula that combines them changed (IVA applied per
-- line, no separate logística fee, 30%-seña/70%-cash-with-discount split
-- instead of a 50/50 transfer/cash split).

insert into pricing_seasons (name, start_date, end_date, salon_per_day, sort_order) values
  ('Julio-Agosto 2025', '2025-07-01', '2025-08-31', 150000, 1),
  ('Septiembre-Octubre 2025', '2025-09-01', '2025-10-31', 150000, 2),
  ('Noviembre-Diciembre 2025', '2025-11-01', '2025-12-31', 150000, 3),
  ('Enero-Febrero 2026', '2026-01-01', '2026-02-28', 150000, 4),
  ('Marzo-Abril 2026', '2026-03-01', '2026-04-30', 150000, 5),
  ('Mayo-Junio 2026', '2026-05-01', '2026-06-30', 150000, 6),
  ('Julio-Agosto 2026', '2026-07-01', '2026-08-31', 181500, 7),
  ('Septiembre-Octubre 2026', '2026-09-01', '2026-10-31', 193600, 8),
  ('Noviembre-Diciembre 2026', '2026-11-01', '2026-12-31', 205700, 9),
  ('Enero-Febrero 2027', '2027-01-01', '2027-02-28', 205700, 10);

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
  ('Julio-Agosto 2025', 'carpa', 108375),
  ('Julio-Agosto 2025', 'trailer_x1', 89200),
  ('Julio-Agosto 2025', 'trailer_x2', 150400),
  ('Julio-Agosto 2025', 'cabint_individual', 166000),
  ('Julio-Agosto 2025', 'cabint_doble', 232000),
  ('Julio-Agosto 2025', 'cabint_triple', 292400),
  ('Julio-Agosto 2025', 'cabint_cuadruple', 362400),
  ('Julio-Agosto 2025', 'cabext_individual', 134000),
  ('Julio-Agosto 2025', 'cabext_doble', 196800),
  ('Julio-Agosto 2025', 'cabext_triple', 262000),
  ('Julio-Agosto 2025', 'cabext_cuadruple', 324000),
  ('Julio-Agosto 2025', 'cabext_quintuple', 404400),
  ('Julio-Agosto 2025', 'cabext_sextuple', 467200),

  ('Septiembre-Octubre 2025', 'carpa', 65626),
  ('Septiembre-Octubre 2025', 'trailer_x1', 93256),
  ('Septiembre-Octubre 2025', 'trailer_x2', 157672),
  ('Septiembre-Octubre 2025', 'cabint_individual', 172360),
  ('Septiembre-Octubre 2025', 'cabint_doble', 241720),
  ('Septiembre-Octubre 2025', 'cabint_triple', 305312),
  ('Septiembre-Octubre 2025', 'cabint_cuadruple', 378792),
  ('Septiembre-Octubre 2025', 'cabext_individual', 139400),
  ('Septiembre-Octubre 2025', 'cabext_doble', 205464),
  ('Septiembre-Octubre 2025', 'cabext_triple', 274000),
  ('Septiembre-Octubre 2025', 'cabext_cuadruple', 339240),
  ('Septiembre-Octubre 2025', 'cabext_quintuple', 423432),
  ('Septiembre-Octubre 2025', 'cabext_sextuple', 489496),

  ('Noviembre-Diciembre 2025', 'carpa', 69564.6),
  ('Noviembre-Diciembre 2025', 'trailer_x1', 98851.6),
  ('Noviembre-Diciembre 2025', 'trailer_x2', 163523.2),
  ('Noviembre-Diciembre 2025', 'cabint_individual', 182701.6),
  ('Noviembre-Diciembre 2025', 'cabint_doble', 256223.2),
  ('Noviembre-Diciembre 2025', 'cabint_triple', 323630.8),
  ('Noviembre-Diciembre 2025', 'cabint_cuadruple', 401519.4),
  ('Noviembre-Diciembre 2025', 'cabext_individual', 147763.6),
  ('Noviembre-Diciembre 2025', 'cabext_doble', 217792.2),
  ('Noviembre-Diciembre 2025', 'cabext_triple', 290439.8),
  ('Noviembre-Diciembre 2025', 'cabext_cuadruple', 359594.4),
  ('Noviembre-Diciembre 2025', 'cabext_quintuple', 448838),
  ('Noviembre-Diciembre 2025', 'cabext_sextuple', 518865.6),

  ('Enero-Febrero 2026', 'carpa', 73737.74),
  ('Enero-Febrero 2026', 'trailer_x1', 104782.74),
  ('Enero-Febrero 2026', 'trailer_x2', 173334.47),
  ('Enero-Febrero 2026', 'cabint_individual', 193663.74),
  ('Enero-Febrero 2026', 'cabint_doble', 271596.47),
  ('Enero-Febrero 2026', 'cabint_triple', 343049.21),
  ('Enero-Febrero 2026', 'cabint_cuadruple', 425610.94),
  ('Enero-Febrero 2026', 'cabext_individual', 156629.74),
  ('Enero-Febrero 2026', 'cabext_doble', 230859.47),
  ('Enero-Febrero 2026', 'cabext_triple', 307866.21),
  ('Enero-Febrero 2026', 'cabext_cuadruple', 381169.94),
  ('Enero-Febrero 2026', 'cabext_quintuple', 475768.68),
  ('Enero-Febrero 2026', 'cabext_sextuple', 549997.42),

  ('Marzo-Abril 2026', 'carpa', 78161.94),
  ('Marzo-Abril 2026', 'trailer_x1', 111069.94),
  ('Marzo-Abril 2026', 'trailer_x2', 183734.88),
  ('Marzo-Abril 2026', 'cabint_individual', 205283.94),
  ('Marzo-Abril 2026', 'cabint_doble', 287891.88),
  ('Marzo-Abril 2026', 'cabint_triple', 363631.82),
  ('Marzo-Abril 2026', 'cabint_cuadruple', 451146.76),
  ('Marzo-Abril 2026', 'cabext_individual', 166027.94),
  ('Marzo-Abril 2026', 'cabext_doble', 244710.88),
  ('Marzo-Abril 2026', 'cabext_triple', 326338.82),
  ('Marzo-Abril 2026', 'cabext_cuadruple', 404039.76),
  ('Marzo-Abril 2026', 'cabext_quintuple', 504313.7),
  ('Marzo-Abril 2026', 'cabext_sextuple', 582997.64),

  ('Mayo-Junio 2026', 'carpa', 82070.1),
  ('Mayo-Junio 2026', 'trailer_x1', 116623.5),
  ('Mayo-Junio 2026', 'trailer_x2', 192921.75),
  ('Mayo-Junio 2026', 'cabint_individual', 215548.2),
  ('Mayo-Junio 2026', 'cabint_doble', 302286.6),
  ('Mayo-Junio 2026', 'cabint_triple', 381813.6),
  ('Mayo-Junio 2026', 'cabint_cuadruple', 473704.35),
  ('Mayo-Junio 2026', 'cabext_individual', 174329.4),
  ('Mayo-Junio 2026', 'cabext_doble', 256946.55),
  ('Mayo-Junio 2026', 'cabext_triple', 342655.95),
  ('Mayo-Junio 2026', 'cabext_cuadruple', 424242),
  ('Mayo-Junio 2026', 'cabext_quintuple', 529529.7),
  ('Mayo-Junio 2026', 'cabext_sextuple', 612147.9),

  ('Julio-Agosto 2026', 'carpa', 86173.92),
  ('Julio-Agosto 2026', 'trailer_x1', 122454.99),
  ('Julio-Agosto 2026', 'trailer_x2', 202568.47),
  ('Julio-Agosto 2026', 'cabint_individual', 226325.92),
  ('Julio-Agosto 2026', 'cabint_doble', 317401.56),
  ('Julio-Agosto 2026', 'cabint_triple', 400905.22),
  ('Julio-Agosto 2026', 'cabint_cuadruple', 497390.83),
  ('Julio-Agosto 2026', 'cabext_individual', 183046.18),
  ('Julio-Agosto 2026', 'cabext_doble', 269794.51),
  ('Julio-Agosto 2026', 'cabext_triple', 359789.69),
  ('Julio-Agosto 2026', 'cabext_cuadruple', 445455.36),
  ('Julio-Agosto 2026', 'cabext_quintuple', 556007.76),
  ('Julio-Agosto 2026', 'cabext_sextuple', 642757.19),

  ('Septiembre-Octubre 2026', 'carpa', 90482.72),
  ('Septiembre-Octubre 2026', 'trailer_x1', 128577.84),
  ('Septiembre-Octubre 2026', 'trailer_x2', 212697.1),
  ('Septiembre-Octubre 2026', 'cabint_individual', 237642.33),
  ('Septiembre-Octubre 2026', 'cabint_doble', 333271.85),
  ('Septiembre-Octubre 2026', 'cabint_triple', 420950.8),
  ('Septiembre-Octubre 2026', 'cabint_cuadruple', 522260.79),
  ('Septiembre-Octubre 2026', 'cabext_individual', 192198.6),
  ('Septiembre-Octubre 2026', 'cabext_doble', 283284.44),
  ('Septiembre-Octubre 2026', 'cabext_triple', 377779.49),
  ('Septiembre-Octubre 2026', 'cabext_cuadruple', 467728.55),
  ('Septiembre-Octubre 2026', 'cabext_quintuple', 583808.67),
  ('Septiembre-Octubre 2026', 'cabext_sextuple', 674895.67),

  ('Noviembre-Diciembre 2026', 'carpa', 93844.14),
  ('Noviembre-Diciembre 2026', 'trailer_x1', 131939.26),
  ('Noviembre-Diciembre 2026', 'trailer_x2', 219419.94),
  ('Noviembre-Diciembre 2026', 'cabint_individual', 241003.74),
  ('Noviembre-Diciembre 2026', 'cabint_doble', 339994.68),
  ('Noviembre-Diciembre 2026', 'cabint_triple', 431035.05),
  ('Noviembre-Diciembre 2026', 'cabint_cuadruple', 535706.46),
  ('Noviembre-Diciembre 2026', 'cabext_individual', 195560.02),
  ('Noviembre-Diciembre 2026', 'cabext_doble', 290007.28),
  ('Noviembre-Diciembre 2026', 'cabext_triple', 387863.74),
  ('Noviembre-Diciembre 2026', 'cabext_cuadruple', 481174.22),
  ('Noviembre-Diciembre 2026', 'cabext_quintuple', 600615.76),
  ('Noviembre-Diciembre 2026', 'cabext_sextuple', 695064.18),

  ('Enero-Febrero 2027', 'carpa', 95961.83),
  ('Enero-Febrero 2027', 'trailer_x1', 131939.26),
  ('Enero-Febrero 2027', 'trailer_x2', 223655.32),
  ('Enero-Febrero 2027', 'cabint_individual', 243121.44),
  ('Enero-Febrero 2027', 'cabint_doble', 344230.07),
  ('Enero-Febrero 2027', 'cabint_triple', 437388.13),
  ('Enero-Febrero 2027', 'cabint_cuadruple', 544177.23),
  ('Enero-Febrero 2027', 'cabext_individual', 195560.02),
  ('Enero-Febrero 2027', 'cabext_doble', 294242.66),
  ('Enero-Febrero 2027', 'cabext_triple', 394216.82),
  ('Enero-Febrero 2027', 'cabext_cuadruple', 489644.99),
  ('Enero-Febrero 2027', 'cabext_quintuple', 611204.23),
  ('Enero-Febrero 2027', 'cabext_sextuple', 707770.34)
) as v(season_name, code, rate)
join accommodation_types t on t.code = v.code
join pricing_seasons s on s.name = v.season_name;

insert into meal_surcharge_tiers (code, label, protein_tier, surcharge_per_person_total, sort_order) values
  ('lunch_only', 'Solo almuerzo con carne (Item 200g)', 'item_200g', 8000, 1),
  ('lunch_only', 'Solo almuerzo con carne (Premium 400g)', 'premium_400g', 12000, 2),
  ('lunch_dinner', 'Almuerzo y cena con carne (Item 200g)', 'item_200g', 14000, 3),
  ('lunch_dinner', 'Almuerzo y cena con carne (Premium 400g)', 'premium_400g', 20000, 4),
  ('full', 'Todas las comidas con carne (Item 200g)', 'item_200g', 22000, 5),
  ('full', 'Todas las comidas con carne (Premium 400g)', 'premium_400g', 32000, 6);

insert into discount_tiers_nights (min_nights, max_nights, discount_pct) values
  (1, 2, 0),
  (3, 4, 3),
  (5, 9, 5),
  (10, null, 10);

insert into discount_tiers_headcount (min_people, discount_pct) values
  (16, 3),
  (26, 6),
  (41, 10);

-- flat_adjustment: Nave's salon usage is already covered by the fixed
-- salon_per_day (per season, above), charged on every quote. Nodriza gets
-- a flat discount off the retreat's final total
-- (confirmed by Umepay staff, matches the "DESCUENTO por uso de salon
-- Nodriza" line found in several real per-event budget tabs).
insert into salon_thresholds (salon_code, label, min_people, max_people, long_weekend_min_nights, long_weekend_min_people, flat_adjustment) values
  ('nave', 'Nave', 16, null, 3, 20, 0),
  ('nodriza', 'Nodriza', 8, 14, null, null, -250000);

insert into pricing_settings (id, iva_pct, deposit_pct, extra_meal_price, cash_discount_pct) values
  (true, 21, 30, 24485.2, 20);
