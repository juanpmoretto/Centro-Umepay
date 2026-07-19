-- Phase 2 placeholder pricing data.
--
-- IMPORTANT: these are illustrative example numbers for local development and
-- UI testing only -- NOT real Centro Umepay rates. The master spreadsheet's
-- real numbers vary by season/event and are internally inconsistent across
-- ad-hoc quote copies, so guessing at "the real price" here would risk
-- shipping wrong numbers to a real client. Before Phase 2 goes live with
-- actual clients, either hand-enter the current real rates here from the
-- master sheet, or wait for the Phase 3 Google Sheets sync (supabase/functions/
-- sync-pricing) to populate these tables for real.

insert into pricing_seasons (name, start_date, end_date, sort_order) values
  ('Temporada Alta (Oct-Ene)', '2026-10-01', '2027-01-31', 1),
  ('Temporada Media (Feb-Jun)', '2026-02-01', '2026-06-30', 2),
  ('Temporada Baja (Jul-Sep)', '2026-07-01', '2026-09-30', 3);

insert into accommodation_types (code, label, min_capacity, max_capacity, total_units, bathroom_type, sort_order) values
  ('carpa', 'Carpa', 1, 2, 10, 'exterior', 1),
  ('trailer_1', 'Trailer individual', 1, 1, 8, 'exterior', 2),
  ('trailer_2', 'Trailer doble', 2, 2, 8, 'exterior', 3),
  ('cabana_int', 'Cabaña con baño interior', 1, 4, 5, 'interior', 4),
  ('cabana_ext', 'Cabaña con baño exterior', 4, 6, 3, 'exterior', 5);

-- price_per_person_per_night, illustrative only (see note above)
insert into accommodation_rates (season_id, accommodation_type_id, price_per_person_per_night)
select s.id, a.code_id, v.price
from (values
  ('Temporada Alta (Oct-Ene)', 'carpa', 25000),
  ('Temporada Alta (Oct-Ene)', 'trailer_1', 35000),
  ('Temporada Alta (Oct-Ene)', 'trailer_2', 30000),
  ('Temporada Alta (Oct-Ene)', 'cabana_int', 45000),
  ('Temporada Alta (Oct-Ene)', 'cabana_ext', 40000),
  ('Temporada Media (Feb-Jun)', 'carpa', 20000),
  ('Temporada Media (Feb-Jun)', 'trailer_1', 28000),
  ('Temporada Media (Feb-Jun)', 'trailer_2', 24000),
  ('Temporada Media (Feb-Jun)', 'cabana_int', 36000),
  ('Temporada Media (Feb-Jun)', 'cabana_ext', 32000),
  ('Temporada Baja (Jul-Sep)', 'carpa', 17000),
  ('Temporada Baja (Jul-Sep)', 'trailer_1', 24000),
  ('Temporada Baja (Jul-Sep)', 'trailer_2', 20000),
  ('Temporada Baja (Jul-Sep)', 'cabana_int', 30000),
  ('Temporada Baja (Jul-Sep)', 'cabana_ext', 27000)
) as v(season_name, code, price)
join pricing_seasons s on s.name = v.season_name
join (select id as code_id, code from accommodation_types) a on a.code = v.code;

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

-- flat_adjustment: Nave's salon cost is already folded into the per-person
-- accommodation rates above, so it gets no further adjustment. Nodriza gets
-- a flat discount off the retreat's final total (confirmed by Umepay staff).
insert into salon_thresholds (salon_code, label, min_people, max_people, long_weekend_min_nights, long_weekend_min_people, flat_adjustment) values
  ('nave', 'Nave', 16, null, 3, 20, 0),
  ('nodriza', 'Nodriza', 8, 14, null, null, -250000);

insert into pricing_settings (id, iva_pct, deposit_pct, extra_meal_price) values (true, 21, 30, 24485);
