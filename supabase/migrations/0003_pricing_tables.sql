-- Pricing configuration, synced from the "Tarifas_App" tab of the master
-- Google Sheet (see supabase/functions/sync-pricing). All of these are fully
-- replaced (delete+insert in one transaction) on every successful sync.

create table pricing_seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  sort_order int not null default 0,
  synced_at timestamptz not null default now()
);

create table accommodation_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  min_capacity int not null,
  max_capacity int not null,
  total_units int not null,
  bathroom_type text not null check (bathroom_type in ('interior', 'exterior')),
  sort_order int not null default 0
);

create table accommodation_rates (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references pricing_seasons(id) on delete cascade,
  accommodation_type_id uuid not null references accommodation_types(id) on delete cascade,
  price_per_person_per_night numeric(12, 2) not null,
  synced_at timestamptz not null default now(),
  unique (season_id, accommodation_type_id)
);

create table meal_surcharge_tiers (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  label text not null,
  protein_tier text not null check (protein_tier in ('item_200g', 'premium_400g')),
  surcharge_per_person_total numeric(12, 2) not null,
  sort_order int not null default 0,
  unique (code, protein_tier)
);

create table discount_tiers_nights (
  id uuid primary key default gen_random_uuid(),
  min_nights int not null,
  max_nights int,
  discount_pct numeric(5, 2) not null
);

create table discount_tiers_headcount (
  id uuid primary key default gen_random_uuid(),
  min_people int not null,
  discount_pct numeric(5, 2) not null
);

create table salon_thresholds (
  id uuid primary key default gen_random_uuid(),
  salon_code text not null unique,
  label text not null,
  min_people int not null,
  max_people int,
  long_weekend_min_nights int,
  long_weekend_min_people int
);

-- Global settings, singleton row. iva_pct/deposit_pct confirmed against a real
-- quote example (21% IVA on 50% of the discounted subtotal, 30% deposit); kept
-- here (not hardcoded) since staff may tune them over time via the sheet.
create table pricing_settings (
  id boolean primary key default true check (id),
  iva_pct numeric(5, 2) not null default 21,
  deposit_pct numeric(5, 2) not null default 30,
  synced_at timestamptz not null default now()
);

create table pricing_sync_log (
  id uuid primary key default gen_random_uuid(),
  triggered_by uuid references auth.users(id),
  trigger_type text not null check (trigger_type in ('manual', 'cron')),
  status text not null check (status in ('success', 'error')),
  error_detail text,
  rows_synced int,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
