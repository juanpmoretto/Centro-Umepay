-- Booking requests: replaces the Google Form + manual calendar.
create table booking_requests (
  id uuid primary key default gen_random_uuid(),

  -- requested stay (end_date is exclusive of checkout day, i.e. last night stayed is end_date - 1)
  start_date date not null,
  end_date date not null,

  -- organizer fields (mirrors the previous Google Form)
  organizer_name text not null,
  organizer_email text not null,
  organizer_phone text not null,
  operating_location text not null,
  is_first_time_facilitating boolean not null,
  retreat_type text not null,
  profession text not null,
  estimated_participants text not null check (estimated_participants in ('10-12', '16-20', '20-30', '30+')),
  familiar_with_center boolean not null,
  referral_source text not null,

  -- lifecycle
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'released')),
  staff_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),

  constraint valid_range check (end_date > start_date)
);

create index booking_requests_status_idx on booking_requests(status);

create index booking_requests_date_idx on booking_requests
  using gist (daterange(start_date, end_date, '[)'))
  where status in ('pending', 'confirmed');

-- Hard-prevent two CONFIRMED bookings from ever overlapping. Overlapping PENDING
-- requests are allowed to coexist (both show as tentatively held); staff resolve
-- the conflict manually when confirming one and releasing the other.
alter table booking_requests
  add constraint no_overlap_confirmed
  exclude using gist (daterange(start_date, end_date, '[)') with &&)
  where (status = 'confirmed');
