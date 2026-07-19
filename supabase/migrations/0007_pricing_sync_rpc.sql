-- Single entry point for the sync-pricing Edge Function: takes the already
-- validated payload (natural keys: season_name, accommodation_code, etc. --
-- validation happens in parseSheet.ts before this is ever called) and does a
-- full delete+insert replace of every pricing table. Because this all runs
-- inside one plpgsql function body, Postgres treats it as a single atomic
-- transaction: if anything raises (e.g. a stray FK issue we didn't catch in
-- the Edge Function), everything rolls back and the app keeps serving the
-- previous config untouched.
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

  insert into salon_thresholds (salon_code, label, min_people, max_people, long_weekend_min_nights, long_weekend_min_people)
  select
    (s->>'salon_code'),
    (s->>'label'),
    (s->>'min_people')::int,
    nullif(s->>'max_people', 'null')::int,
    nullif(s->>'long_weekend_min_nights', 'null')::int,
    nullif(s->>'long_weekend_min_people', 'null')::int
  from jsonb_array_elements(payload->'salonThresholds') as s;
  rows_synced := rows_synced + (select count(*) from salon_thresholds);

  update pricing_settings
  set
    iva_pct = coalesce((payload->'globalSettings'->>'iva_pct')::numeric, iva_pct),
    deposit_pct = coalesce((payload->'globalSettings'->>'deposit_pct')::numeric, deposit_pct),
    synced_at = now();

  return rows_synced;
end;
$$;

-- Only callable with the service-role key (Edge Function), never by staff or
-- anon directly -- this bypasses RLS entirely by design (security definer),
-- so it must not be reachable from the public API surface.
revoke execute on function sync_pricing_config(jsonb) from public;
grant execute on function sync_pricing_config(jsonb) to service_role;
