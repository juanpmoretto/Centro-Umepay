-- Replaces the single flat "current" season with the 10 real bimonthly
-- pricing periods found in the master spreadsheet (one tab per period:
-- JULIO-AGOSTO, SEPT-OCT, NOV-DIC, ENE-FEB, MAR-ABR, MAY-JUN26, JUL-AGO26,
-- SEP-OCT26, NOV-DIC26, ENE-FEB27). These aren't seasonal (summer/winter)
-- price differences -- Centro Umepay re-prices roughly every two months to
-- track inflation, confirmed by the steady ~5% step-up between consecutive
-- periods. Salon usage cost also increases the same way, so it moves from
-- a single global pricing_settings value to a per-season one.
--
-- Known gap: no separate per-season "logística" fixed fee was found in
-- these tabs (only the master template's generic copy has one) -- kept as
-- the single global pricing_settings.logistics_flat value for all periods.

alter table pricing_seasons add column salon_per_day numeric(12, 2) not null default 58557.23;
alter table pricing_settings drop column salon_per_day;

delete from pricing_seasons; -- cascades to accommodation_rates

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
join pricing_seasons s on s.name = v.season_name
join accommodation_types t on t.code = v.code;

-- sync_pricing_config() needs salon_per_day moved from globalSettings into
-- the per-season insert, and dropped from the pricing_settings update.
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
    logistics_flat = coalesce((payload->'globalSettings'->>'logistics_flat')::numeric, logistics_flat),
    synced_at = now();

  return rows_synced;
end;
$$;
