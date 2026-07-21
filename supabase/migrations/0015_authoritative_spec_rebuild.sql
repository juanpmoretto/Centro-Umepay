-- Full rebuild from the authoritative specification the user extracted
-- directly from the real Excel formulas and confirmed point-by-point with
-- Rochi (the business owner). Supersedes migrations 0012-0014, which were
-- based on the app author's own (imperfect) formula reading. Key changes:
--
-- 1. Only 4 active seasons: JUL-AGO26, SEP-OCT26, NOV-DIC26, ENE-FEB27
--    (older/passed seasons dropped from scope entirely).
-- 2. Lodging and food are priced SEPARATELY per accommodation line (not
--    combined into one rate) -- both get IVA (1.21) applied independently.
-- 3. The nights/headcount discounts are computed on ONE NIGHT of
--    lodging-only cost (not the multi-night, food-inclusive total) -- this
--    was a real bug in the previous version.
-- 4. Nights discount tiers are now per-season (JUL-AGO26 has a one-off 10%
--    promo at the 5-9 night tier that the other seasons don't have).
-- 5. New "liberados" bonification: for 16+ pax, 1x/2x/3x the cost of one
--    trailer x1 line (at that season's rate) is SUBTRACTED from the total.
-- 6. The old flat per-tier meal surcharge model is replaced by the real
--    formula-driven carne addon (per-season meat_base_price -> 200g/400g
--    unit prices via a fixed formula) across 3 meal plans.

-- --- seasons: drop the old 10, replace with the 4 real active ones ---
delete from pricing_seasons; -- cascades to accommodation_rates

alter table pricing_seasons add column food_price_per_person_per_night numeric(12, 2) not null default 0;
alter table pricing_seasons add column meat_base_price numeric(12, 2) not null default 0;

insert into pricing_seasons (name, start_date, end_date, salon_per_day, food_price_per_person_per_night, meat_base_price, sort_order) values
  ('Julio-Agosto 2026', '2026-07-01', '2026-08-31', 181500, 64026.90, 22000, 1),
  ('Septiembre-Octubre 2026', '2026-09-01', '2026-10-31', 193600, 67228.35, 23000, 2),
  ('Noviembre-Diciembre 2026', '2026-11-01', '2026-12-31', 205700, 70589.77, 24000, 3),
  ('Enero-Febrero 2027', '2027-01-01', '2027-02-28', 205700, 72707.46, 25000, 4);

-- --- accommodation_types: add category for shared-capacity-pool validation ---
alter table accommodation_types add column category text;
update accommodation_types set category = case
  when code like 'trailer%' then 'trailer'
  when code like 'cabint%' then 'cabin_interior'
  when code like 'cabext%' then 'cabin_exterior'
  else 'carpa'
end;
alter table accommodation_types alter column category set not null;

-- --- accommodation_rates: lodging only now (was lodging+food combined) ---
alter table accommodation_rates rename column combined_rate_per_night to lodging_rate_per_night;

insert into accommodation_rates (season_id, accommodation_type_id, lodging_rate_per_night)
select s.id, t.id, v.rate
from (values
  ('Julio-Agosto 2026', 'carpa', 22147.02),
  ('Julio-Agosto 2026', 'trailer_x1', 58428.09),
  ('Julio-Agosto 2026', 'trailer_x2', 74514.67),
  ('Julio-Agosto 2026', 'cabint_individual', 162299.03),
  ('Julio-Agosto 2026', 'cabint_doble', 189347.76),
  ('Julio-Agosto 2026', 'cabint_triple', 208824.53),
  ('Julio-Agosto 2026', 'cabint_cuadruple', 241283.23),
  ('Julio-Agosto 2026', 'cabext_individual', 119019.29),
  ('Julio-Agosto 2026', 'cabext_doble', 141740.71),
  ('Julio-Agosto 2026', 'cabext_triple', 167708.99),
  ('Julio-Agosto 2026', 'cabext_cuadruple', 189347.76),
  ('Julio-Agosto 2026', 'cabext_quintuple', 235873.26),
  ('Julio-Agosto 2026', 'cabext_sextuple', 258595.79),

  ('Septiembre-Octubre 2026', 'carpa', 23254.37),
  ('Septiembre-Octubre 2026', 'trailer_x1', 61349.49),
  ('Septiembre-Octubre 2026', 'trailer_x2', 78240.40),
  ('Septiembre-Octubre 2026', 'cabint_individual', 170413.98),
  ('Septiembre-Octubre 2026', 'cabint_doble', 198815.15),
  ('Septiembre-Octubre 2026', 'cabint_triple', 219265.75),
  ('Septiembre-Octubre 2026', 'cabint_cuadruple', 253347.39),
  ('Septiembre-Octubre 2026', 'cabext_individual', 124970.25),
  ('Septiembre-Octubre 2026', 'cabext_doble', 148827.74),
  ('Septiembre-Octubre 2026', 'cabext_triple', 176094.44),
  ('Septiembre-Octubre 2026', 'cabext_cuadruple', 198815.15),
  ('Septiembre-Octubre 2026', 'cabext_quintuple', 247666.92),
  ('Septiembre-Octubre 2026', 'cabext_sextuple', 271525.57),

  ('Noviembre-Diciembre 2026', 'carpa', 23254.37),
  ('Noviembre-Diciembre 2026', 'trailer_x1', 61349.49),
  ('Noviembre-Diciembre 2026', 'trailer_x2', 78240.40),
  ('Noviembre-Diciembre 2026', 'cabint_individual', 170413.98),
  ('Noviembre-Diciembre 2026', 'cabint_doble', 198815.15),
  ('Noviembre-Diciembre 2026', 'cabint_triple', 219265.75),
  ('Noviembre-Diciembre 2026', 'cabint_cuadruple', 253347.39),
  ('Noviembre-Diciembre 2026', 'cabext_individual', 124970.25),
  ('Noviembre-Diciembre 2026', 'cabext_doble', 148827.74),
  ('Noviembre-Diciembre 2026', 'cabext_triple', 176094.44),
  ('Noviembre-Diciembre 2026', 'cabext_cuadruple', 198815.15),
  ('Noviembre-Diciembre 2026', 'cabext_quintuple', 247666.92),
  ('Noviembre-Diciembre 2026', 'cabext_sextuple', 271525.57),

  ('Enero-Febrero 2027', 'carpa', 23254.37),
  ('Enero-Febrero 2027', 'trailer_x1', 61349.49),
  ('Enero-Febrero 2027', 'trailer_x2', 78240.40),
  ('Enero-Febrero 2027', 'cabint_individual', 170413.98),
  ('Enero-Febrero 2027', 'cabint_doble', 198815.15),
  ('Enero-Febrero 2027', 'cabint_triple', 219265.75),
  ('Enero-Febrero 2027', 'cabint_cuadruple', 253347.39),
  ('Enero-Febrero 2027', 'cabext_individual', 124970.25),
  ('Enero-Febrero 2027', 'cabext_doble', 148827.74),
  ('Enero-Febrero 2027', 'cabext_triple', 176094.44),
  ('Enero-Febrero 2027', 'cabext_cuadruple', 198815.15),
  ('Enero-Febrero 2027', 'cabext_quintuple', 247666.92),
  ('Enero-Febrero 2027', 'cabext_sextuple', 271525.57)
) as v(season_name, code, rate)
join pricing_seasons s on s.name = v.season_name
join accommodation_types t on t.code = v.code;

-- --- nights discount: now per-season ---
alter table discount_tiers_nights add column season_id uuid references pricing_seasons(id) on delete cascade;
delete from discount_tiers_nights;

insert into discount_tiers_nights (season_id, min_nights, max_nights, discount_pct)
select s.id, v.min_nights, v.max_nights, v.discount_pct
from pricing_seasons s
join (values
  ('Julio-Agosto 2026', 1, 2, 0), ('Julio-Agosto 2026', 3, 4, 3), ('Julio-Agosto 2026', 5, 9, 10), ('Julio-Agosto 2026', 10, null, 10),
  ('Septiembre-Octubre 2026', 1, 2, 0), ('Septiembre-Octubre 2026', 3, 4, 3), ('Septiembre-Octubre 2026', 5, 9, 5), ('Septiembre-Octubre 2026', 10, null, 10),
  ('Noviembre-Diciembre 2026', 1, 2, 0), ('Noviembre-Diciembre 2026', 3, 4, 3), ('Noviembre-Diciembre 2026', 5, 9, 5), ('Noviembre-Diciembre 2026', 10, null, 10),
  ('Enero-Febrero 2027', 1, 2, 0), ('Enero-Febrero 2027', 3, 4, 3), ('Enero-Febrero 2027', 5, 9, 5), ('Enero-Febrero 2027', 10, null, 10)
) as v(season_name, min_nights, max_nights, discount_pct) on v.season_name = s.name;

alter table discount_tiers_nights alter column season_id set not null;

-- headcount discount stays global, but refresh to the confirmed tiers (3/6/10 at 16/26/41)
delete from discount_tiers_headcount;
insert into discount_tiers_headcount (min_people, discount_pct) values
  (16, 3),
  (26, 6),
  (41, 10);

-- --- liberados bonification tiers (new) ---
create table liberados_tiers (
  id uuid primary key default gen_random_uuid(),
  min_people int not null,
  max_people int,
  multiplier int not null
);

insert into liberados_tiers (min_people, max_people, multiplier) values
  (16, 23, 1),
  (24, 31, 2),
  (32, null, 3);

alter table liberados_tiers enable row level security;
create policy "public read liberados tiers" on liberados_tiers for select to anon using (true);
create policy "staff write liberados tiers" on liberados_tiers for all to authenticated using (true) with check (true);
grant select on liberados_tiers to anon;
grant select, insert, update, delete on liberados_tiers to authenticated;

-- --- drop the old flat meal-surcharge model, replaced by formula-driven carne addon ---
alter table quotes drop column meal_tier_id;
alter table quote_inquiries drop column adjusted_meal_tier_id;
drop table meal_surcharge_tiers;

-- --- quotes/quote_inquiries: new meal-plan fields ---
alter table quotes add column meal_plan text check (meal_plan in ('lunch_only', 'lunch_dinner', 'full_board'));
alter table quotes add column meat_200g_count int not null default 0;
alter table quotes add column meat_400g_count int not null default 0;
alter table quotes drop column extra_meals_count;

alter table quote_inquiries add column adjusted_meal_plan text check (adjusted_meal_plan in ('lunch_only', 'lunch_dinner', 'full_board'));
alter table quote_inquiries add column adjusted_meat_200g_count int not null default 0;
alter table quote_inquiries add column adjusted_meat_400g_count int not null default 0;
alter table quote_inquiries drop column adjusted_extra_meals_count;

-- --- pricing_settings: drop the now-unused extra_meal_price ---
alter table pricing_settings drop column extra_meal_price;

-- sync_pricing_config() rebuilt for the new schema (seasons carry
-- food/meat prices and their own nights-discount tiers now; no more
-- meal_surcharge_tiers; new liberados_tiers).
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
  delete from discount_tiers_nights;
  delete from pricing_seasons;
  delete from accommodation_types;
  delete from discount_tiers_headcount;
  delete from salon_thresholds;
  delete from liberados_tiers;

  insert into pricing_seasons (name, start_date, end_date, salon_per_day, food_price_per_person_per_night, meat_base_price, sort_order)
  select
    (s->>'season_name'),
    (s->>'start_date')::date,
    (s->>'end_date')::date,
    (s->>'salon_per_day')::numeric,
    (s->>'food_price_per_person_per_night')::numeric,
    (s->>'meat_base_price')::numeric,
    row_number() over ()
  from jsonb_array_elements(payload->'seasons') as s;
  get diagnostics rows_synced = row_count;

  insert into accommodation_types (code, label, min_capacity, max_capacity, total_units, bathroom_type, category, sort_order)
  select
    (a->>'code'),
    (a->>'label'),
    (a->>'min_capacity')::int,
    (a->>'max_capacity')::int,
    (a->>'total_units')::int,
    (a->>'bathroom_type'),
    (a->>'category'),
    row_number() over ()
  from jsonb_array_elements(payload->'accommodationTypes') as a;
  rows_synced := rows_synced + (select count(*) from accommodation_types);

  insert into accommodation_rates (season_id, accommodation_type_id, lodging_rate_per_night)
  select
    ps.id,
    at.id,
    (r->>'lodging_rate_per_night')::numeric
  from jsonb_array_elements(payload->'rates') as r
  join pricing_seasons ps on ps.name = r->>'season_name'
  join accommodation_types at on at.code = r->>'accommodation_code';
  rows_synced := rows_synced + (select count(*) from accommodation_rates);

  insert into discount_tiers_nights (season_id, min_nights, max_nights, discount_pct)
  select
    ps.id,
    (n->>'min_nights')::int,
    nullif(n->>'max_nights', 'null')::int,
    (n->>'discount_pct')::numeric
  from jsonb_array_elements(payload->'nightsDiscounts') as n
  join pricing_seasons ps on ps.name = n->>'season_name';
  rows_synced := rows_synced + (select count(*) from discount_tiers_nights);

  insert into discount_tiers_headcount (min_people, discount_pct)
  select
    (h->>'min_people')::int,
    (h->>'discount_pct')::numeric
  from jsonb_array_elements(payload->'headcountDiscounts') as h;
  rows_synced := rows_synced + (select count(*) from discount_tiers_headcount);

  insert into liberados_tiers (min_people, max_people, multiplier)
  select
    (l->>'min_people')::int,
    nullif(l->>'max_people', 'null')::int,
    (l->>'multiplier')::int
  from jsonb_array_elements(payload->'liberadosTiers') as l;
  rows_synced := rows_synced + (select count(*) from liberados_tiers);

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
    cash_discount_pct = coalesce((payload->'globalSettings'->>'cash_discount_pct')::numeric, cash_discount_pct),
    synced_at = now();

  return rows_synced;
end;
$$;
