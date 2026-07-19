-- A quote is created by staff for one specific client, using their own
-- externally-computed price (staff_quoted_total). The slug is the client's
-- access token to /q/:slug -- there is no anon SELECT on this table (see
-- 0005_rls_policies.sql); access is only via the get_quote_by_slug() RPC.
create table quotes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  created_by uuid not null references auth.users(id),

  retreat_start_date date not null,
  retreat_nights int not null,
  headcount int not null,
  accommodation_mix jsonb not null,
  meal_tier_id uuid references meal_surcharge_tiers(id),

  staff_quoted_total numeric(12, 2) not null,
  staff_note text,

  booking_request_id uuid references booking_requests(id),

  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index quotes_slug_idx on quotes(slug);

-- When a client adjusts params on /q/:slug and sends the exploration back to
-- the team, we snapshot exactly what they saw (not a live reference) so the
-- record stays meaningful even if pricing config changes later.
create table quote_inquiries (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,

  adjusted_nights int not null,
  adjusted_headcount int not null,
  adjusted_accommodation_mix jsonb not null,
  adjusted_meal_tier_id uuid references meal_surcharge_tiers(id),
  estimated_total numeric(12, 2) not null,

  client_message text,
  status text not null default 'new' check (status in ('new', 'reviewed')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,

  created_at timestamptz not null default now()
);

create index quote_inquiries_quote_idx on quote_inquiries(quote_id);

-- security definer: the only legitimate way for an unauthenticated client to
-- read a quote is by knowing its slug. Keeps `quotes` itself locked to staff.
create or replace function get_quote_by_slug(p_slug text)
returns setof quotes
language sql
security definer
set search_path = public
as $$
  select * from quotes where slug = p_slug limit 1;
$$;
